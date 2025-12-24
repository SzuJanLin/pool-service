import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { prisma } from '@/lib/prisma';
import { DayOfWeek, ServiceStatus } from '@prisma/client';

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const handler = async (req: MobileAuthRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
};

const handlePOST = async (req: MobileAuthRequest, res: NextApiResponse) => {
  const user = req.mobileUser;
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const { routeId, status } = req.body;

  if (!routeId || !status) {
    return res.status(400).json({ error: { message: 'Missing routeId or status' } });
  }

  // Validate status is a valid ServiceStatus enum value
  // Note: status from body is a string, we need to check if it's in the enum values
  const isValidStatus = Object.values(ServiceStatus).includes(status as ServiceStatus);
  
  if (!isValidStatus) {
      return res.status(400).json({ error: { message: `Invalid status value: ${status}` } });
  }

  // Verify route belongs to tech
  const route = await prisma.route.findFirst({
    where: {
      id: routeId,
      techId: user.id,
    },
    include: {
      pool: {
        include: {
          customer: true,
        },
      },
    },
  });

  if (!route) {
    return res.status(404).json({ error: { message: 'Route not found' } });
  }

  const companyId = route.pool.customer.companyId;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Find or create service history for today
  let serviceHistory = await prisma.serviceHistory.findFirst({
    where: {
      routeId: routeId,
      serviceDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  if (serviceHistory) {
    // Update existing
    serviceHistory = await prisma.serviceHistory.update({
      where: { id: serviceHistory.id },
      data: {
        status: status as ServiceStatus,
        updatedById: user.id,
      },
    });
  } else {
    // Create new
    serviceHistory = await prisma.serviceHistory.create({
      data: {
        routeId: routeId,
        serviceDate: now,
        status: status as ServiceStatus,
        technicianId: user.id,
        companyId: companyId,
        createdById: user.id,
        updatedById: user.id,
      },
    });
  }

  res.status(200).json({ success: true, data: serviceHistory });
};

const handleGET = async (req: MobileAuthRequest, res: NextApiResponse) => {
  const user = req.mobileUser;
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  // Determine current DayOfWeek
  const now = new Date();
  const days: DayOfWeek[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  const currentDayOfWeek = days[now.getDay()];

  // Fetch routes for this tech and day
  // TODO: Implement advanced frequency logic (biweekly, etc.)
  const routes = await prisma.route.findMany({
    where: {
      techId: user.id,
      dayOfWeek: currentDayOfWeek,
      active: true,
    },
    include: {
      pool: {
        include: {
          customer: true,
        },
      },
    },
  });

  // Fetch service history for today to check status
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const routeIds = routes.map((r) => r.id);
  const serviceHistories = await prisma.serviceHistory.findMany({
    where: {
      routeId: { in: routeIds },
      serviceDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const historyMap = new Map(serviceHistories.map((sh) => [sh.routeId, sh]));

  const assignments = routes.map((route) => {
    const history = historyMap.get(route.id);
    const status = history ? history.status : 'PENDING';
    
    // Construct address string
    const customer = route.pool.customer as any;
    const address = [
      customer.addressStreet,
      customer.addressCity,
      customer.addressState,
      customer.addressZip
    ].filter(Boolean).join(', ');

    return {
      id: route.id,
      poolId: route.poolId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      address: address,
      status: status,
      // Mock distance for now as we don't have coords
      distance: '2.5 miles', 
      poolName: route.pool.name,
      lat: customer.lat ? Number(customer.lat) : null,
      lng: customer.lng ? Number(customer.lng) : null,
      serviceHistoryId: history?.id,
    };
  });

  res.status(200).json({
    success: true,
    data: assignments,
  });
};

export default withMobileAuth(handler);
