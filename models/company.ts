import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { findOrCreateApp } from '@/lib/svix';
import { Role, Company } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from './user';
import { normalizeUser } from './user';
import { validateWithSchema, companySlugSchema } from '@/lib/zod';

export const createCompany = async (param: {
  userId: string;
  name: string;
  slug: string;
}) => {
  const { userId, name, slug } = param;

  const company = await prisma.company.create({
    data: {
      name,
      slug,
    },
  });

  await addCompanyMember(company.id, userId, Role.OWNER);

  await findOrCreateApp(company.name, company.id);

  return company;
};

export const getByCustomerId = async (
  billingId: string
): Promise<Company | null> => {
  return await prisma.company.findFirst({
    where: {
      billingId,
    },
  });
};

export const getCompany = async (key: { id: string } | { slug: string }) => {
  return await prisma.company.findUniqueOrThrow({
    where: key,
  });
};

export const deleteCompany = async (key: { id: string } | { slug: string }) => {
  return await prisma.company.delete({
    where: key,
  });
};

export const addCompanyMember = async (
  companyId: string,
  userId: string,
  role: Role
) => {
  return await prisma.companyMember.upsert({
    create: {
      companyId,
      userId,
      role,
    },
    update: {
      role,
    },
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
  });
};

export const removeCompanyMember = async (companyId: string, userId: string) => {
  return await prisma.companyMember.delete({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
  });
};

/*
Hash Left Join  (cost=103.06..271.50 rows=48 width=184) (actual time=1.498..1.813 rows=48 loops=1)
  Hash Cond: ("Company".id = "aggr_selection_0_CompanyMember"."companyId")
  ->  Nested Loop  (cost=4.82..172.89 rows=48 width=148) (actual time=0.080..0.364 rows=48 loops=1)
        ->  Bitmap Heap Scan on "CompanyMember" t1  (cost=4.65..61.77 rows=48 width=37) (actual time=0.038..0.048 rows=48 loops=1)
              Recheck Cond: ("userId" = '5de1dfe6-edc0-4ef8-9858-0f7250b1022e'::text)
              Filter: ("companyId" IS NOT NULL)
              Heap Blocks: exact=1
              ->  Bitmap Index Scan on "CompanyMember_userId_idx"  (cost=0.00..4.64 rows=48 width=0) (actual time=0.026..0.027 rows=48 loops=1)
                    Index Cond: ("userId" = '5de1dfe6-edc0-4ef8-9858-0f7250b1022e'::text)
        ->  Memoize  (cost=0.17..3.52 rows=1 width=148) (actual time=0.006..0.006 rows=1 loops=48)
              Cache Key: t1."companyId"
              Cache Mode: logical
              Hits: 0  Misses: 48  Evictions: 0  Overflows: 0  Memory Usage: 12kB
              ->  Index Scan using "Company_pkey" on "Company"  (cost=0.15..3.51 rows=1 width=148) (actual time=0.003..0.003 rows=1 loops=48)
                    Index Cond: (id = t1."companyId")
  ->  Hash  (cost=97.62..97.62 rows=50 width=45) (actual time=1.328..1.329 rows=50 loops=1)
        Buckets: 1024  Batches: 1  Memory Usage: 12kB
        ->  Subquery Scan on "aggr_selection_0_CompanyMember"  (cost=96.62..97.62 rows=50 width=45) (actual time=1.274..1.292 rows=50 loops=1)
              ->  HashAggregate  (cost=96.62..97.12 rows=50 width=45) (actual time=1.274..1.284 rows=50 loops=1)
                    Group Key: "CompanyMember"."companyId"
                    Batches: 1  Memory Usage: 24kB
                    ->  Seq Scan on "CompanyMember"  (cost=0.00..83.08 rows=2708 width=37) (actual time=0.004..0.402 rows=2708 loops=1)
Planning Time: 1.276 ms
Execution Time: 2.036 ms
*/

/*
SELECT 
    "public"."Company"."id", 
    "public"."Company"."name", 
    "public"."Company"."slug", 
    "public"."Company"."domain", 
    "public"."Company"."defaultRole"::text, 
    "public"."Company"."createdAt", 
    "public"."Company"."updatedAt", 
    "aggr_selection_0_CompanyMember"."_aggr_count_members" 
FROM "public"."Company" 
LEFT JOIN (
    SELECT "public"."CompanyMember"."companyId", COUNT(*) AS "_aggr_count_members" FROM 
    "public"."CompanyMember" WHERE 1=1 GROUP BY "public"."CompanyMember"."companyId") AS "aggr_selection_0_CompanyMember" 
    ON ("public"."Company"."id" = "aggr_selection_0_CompanyMember"."companyId"
    ) WHERE 
    ("public"."Company"."id") IN (SELECT "t1"."companyId" FROM "public"."CompanyMember" AS "t1" 
WHERE ("t1"."userId" = '34f3bc0e-e955-400b-892e-395edc6fa727' AND "t1"."companyId" IS NOT NULL)) 
OFFSET 0
 */

/*
Nested Loop  (cost=1.01..3.09 rows=1 width=139) (actual time=0.169..0.172 rows=1 loops=1)
  Join Filter: ("Company".id = t1."companyId")
  ->  Nested Loop Left Join  (cost=1.01..2.06 rows=1 width=111) (actual time=0.101..0.102 rows=1 loops=1)
        Join Filter: ("Company".id = "CompanyMember"."companyId")
        ->  Seq Scan on "Company"  (cost=0.00..1.01 rows=1 width=103) (actual time=0.053..0.054 rows=1 loops=1)
        ->  HashAggregate  (cost=1.01..1.02 rows=1 width=45) (actual time=0.034..0.034 rows=1 loops=1)
              Group Key: "CompanyMember"."companyId"
              Batches: 1  Memory Usage: 24kB
              ->  Seq Scan on "CompanyMember"  (cost=0.00..1.01 rows=1 width=37) (actual time=0.023..0.024 rows=1 loops=1)
  ->  Seq Scan on "CompanyMember" t1  (cost=0.00..1.01 rows=1 width=37) (actual time=0.002..0.002 rows=1 loops=1)
        Filter: (("companyId" IS NOT NULL) AND ("userId" = '34f3bc0e-e955-400b-892e-395edc6fa727'::text))
Planning Time: 2.566 ms
Execution Time: 0.322 ms
*/
export const getCompanies = async (userId: string) => {
  return await prisma.company.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });
};

export async function getCompanyRoles(userId: string) {
  return await prisma.companyMember.findMany({
    where: {
      userId,
    },
    select: {
      companyId: true,
      role: true,
    },
  });
}

// Check if the user is an admin or owner of the company
export async function isCompanyAdmin(userId: string, companyId: string) {
  const companyMember = await prisma.companyMember.findUniqueOrThrow({
    where: {
      companyId_userId: {
        userId,
        companyId,
      },
    },
  });

  return companyMember.role === Role.ADMIN || companyMember.role === Role.OWNER;
}

/*
Nested Loop  (cost=4.85..71.87 rows=1 width=159) (actual time=0.127..0.397 rows=58 loops=1)
  ->  Index Scan using "Company_slug_key" on "Company" j1  (cost=0.15..8.17 rows=1 width=32) (actual time=0.027..0.028 rows=1 loops=1)
        Index Cond: (slug = 'beahan,-gusikowski-and-satterfield'::text)
        Filter: (id IS NOT NULL)
  ->  Bitmap Heap Scan on "CompanyMember"  (cost=4.70..63.15 rows=54 width=131) (actual time=0.067..0.316 rows=58 loops=1)
        Recheck Cond: ("companyId" = j1.id)
        Heap Blocks: exact=47
        ->  Bitmap Index Scan on "CompanyMember_companyId_userId_key"  (cost=0.00..4.69 rows=54 width=0) (actual time=0.061..0.061 rows=58 loops=1)
              Index Cond: ("companyId" = j1.id)
Planning Time: 1.273 ms
Execution Time: 0.440 ms

Index Scan using "User_pkey" on "User"  (cost=0.14..8.16 rows=1 width=98) (actual time=0.048..0.048 rows=1 loops=1)
  Index Cond: (id = '5de1dfe6-edc0-4ef8-9858-0f7250b1022e'::text)
Planning Time: 0.682 ms
Execution Time: 0.057 ms
*/

/*
SELECT 
  "public"."CompanyMember"."id", 
  "public"."CompanyMember"."companyId", 
  "public"."CompanyMember"."userId", 
  "public"."CompanyMember"."role"::text, 
  "public"."CompanyMember"."createdAt", 
  "public"."CompanyMember"."updatedAt" 
FROM "public"."CompanyMember" LEFT JOIN "public"."Company" AS "j1" ON ("j1"."id") = ("public"."CompanyMember"."companyId") 
WHERE ("j1"."slug" = 'boxyhq' AND ("j1"."id" IS NOT NULL)) OFFSET 0;

SELECT 
  "public"."User"."id", 
  "public"."User"."name", 
  "public"."User"."email", 
  "public"."User"."image" 
FROM "public"."User" 
WHERE "public"."User"."id" IN ('34f3bc0e-e955-400b-892e-395edc6fa727') OFFSET 0;
*/

/*
Nested Loop  (cost=0.00..2.04 rows=1 width=159) (actual time=0.088..0.089 rows=1 loops=1)
  Join Filter: ("CompanyMember"."companyId" = j1.id)
  ->  Seq Scan on "CompanyMember"  (cost=0.00..1.01 rows=1 width=131) (actual time=0.041..0.041 rows=1 loops=1)
  ->  Seq Scan on "Company" j1  (cost=0.00..1.01 rows=1 width=37) (actual time=0.003..0.003 rows=1 loops=1)
        Filter: ((id IS NOT NULL) AND (slug = 'boxyhq'::text))
Planning Time: 1.356 ms
Execution Time: 0.124 ms

Seq Scan on "User"  (cost=0.00..1.01 rows=1 width=101) (actual time=0.040..0.040 rows=1 loops=1)
  Filter: (id = '34f3bc0e-e955-400b-892e-395edc6fa727'::text)
Planning Time: 0.351 ms
Execution Time: 0.045 ms
*/
export const getCompanyMembers = async (slug: string) => {
  const members = await prisma.companyMember.findMany({
    where: {
      company: {
        slug,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return members?.map((member) => {
    member.user = normalizeUser(member.user);
    return member;
  });
};

export const updateCompany = async (slug: string, data: Partial<Company>) => {
  return await prisma.company.update({
    where: {
      slug,
    },
    data: data,
  });
};

/*
Aggregate  (cost=124.01..124.02 rows=1 width=8) (actual time=0.216..0.216 rows=1 loops=1)
  ->  Seq Scan on "Company"  (cost=0.00..123.82 rows=15 width=32) (actual time=0.083..0.213 rows=1 loops=1)
        Filter: ((name = 'Stracke, Satterfield and Runolfsdottir'::text) OR (slug = 'stracke,-satterfield-and-runolfsdottir'::text))
        Rows Removed by Filter: 49
Planning Time: 0.288 ms
Execution Time: 0.233 ms

Aggregate  (cost=8.18..8.19 rows=1 width=8) (actual time=0.132..0.132 rows=1 loops=1)
  ->  Index Only Scan using "Company_slug_key" on "Company"  (cost=0.15..8.17 rows=1 width=32) (actual time=0.128..0.128 rows=1 loops=1)
        Index Cond: (slug = 'stracke,-satterfield-and-runolfsdottir'::text)
        Heap Fetches: 1
Planning Time: 0.548 ms
Execution Time: 0.182 ms
*/

/*
SELECT COUNT(*) FROM 
  (
    SELECT "public"."Company"."id" FROM "public"."Company" 
    WHERE "public"."Company"."slug" = $1 OFFSET $2
  ) AS "sub"
*/

/*
Aggregate  (cost=1.02..1.03 rows=1 width=8) (actual time=0.019..0.020 rows=1 loops=1)
  ->  Seq Scan on "Company"  (cost=0.00..1.01 rows=1 width=32) (actual time=0.013..0.014 rows=1 loops=1)
        Filter: (slug = 'boxyhq'::text)
        Rows Removed by Filter: 3
Planning Time: 0.352 ms
Execution Time: 0.055 ms
*/
export const isCompanyExists = async (slug: string) => {
  return await prisma.company.count({
    where: {
      slug,
    },
  });
};

// Check if the current user has access to the company
// Should be used in API routes to check if the user has access to the company
export const throwIfNoCompanyAccess = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const session = await getSession(req, res);

  if (!session) {
    throw new Error('Unauthorized');
  }

  const { slug } = validateWithSchema(companySlugSchema, req.query);

  const companyMember = await getCompanyMember(session.user.id, slug);

  if (!companyMember) {
    throw new Error('You do not have access to this company');
  }

  return {
    ...companyMember,
    user: {
      ...session.user,
    },
  };
};

/*
Limit  (cost=0.44..16.82 rows=1 width=159) (actual time=0.009..0.010 rows=0 loops=1)
  ->  Nested Loop  (cost=0.44..16.82 rows=1 width=159) (actual time=0.009..0.009 rows=0 loops=1)
        ->  Index Scan using "Company_slug_key" on "Company" j1  (cost=0.15..8.17 rows=1 width=32) (actual time=0.008..0.009 rows=0 loops=1)
              Index Cond: (slug = 'boxyhq'::text)
              Filter: (id IS NOT NULL)
        ->  Index Scan using "CompanyMember_companyId_userId_key" on "CompanyMember"  (cost=0.28..8.32 rows=1 width=131) (never executed)
              Index Cond: (("companyId" = j1.id) AND ("userId" = '5de1dfe6-edc0-4ef8-9858-0f7250b1022e'::text))
              Filter: (role = ANY (ARRAY[('ADMIN'::cstring)::"Role", ('MEMBER'::cstring)::"Role", ('OWNER'::cstring)::"Role"]))
Planning Time: 1.073 ms
Execution Time: 0.047 ms

Index Scan using "Company_pkey" on "Company"  (cost=0.15..8.18 rows=1 width=176) (actual time=0.092..0.094 rows=1 loops=1)
  Index Cond: (id = '386a5102-0427-403a-b6c1-877de86d1ce0'::text)
Planning Time: 0.487 ms
Execution Time: 0.133 ms
*/

/*
SELECT 
    "public"."CompanyMember"."id", 
    "public"."CompanyMember"."companyId", 
    "public"."CompanyMember"."userId", 
    "public"."CompanyMember"."role"::text, 
    "public"."CompanyMember"."createdAt", 
    "public"."CompanyMember"."updatedAt" 
FROM "public"."CompanyMember" LEFT JOIN "public"."Company" AS "j1" ON ("j1"."id") = ("public"."CompanyMember"."companyId") 
WHERE (
    "public"."CompanyMember"."userId" = '34f3bc0e-e955-400b-892e-395edc6fa727' AND 
        (
            "j1"."slug" = 'boxyhq' AND ("j1"."id" IS NOT NULL)
        ) AND "public"."CompanyMember"."role" IN 
            (CAST('ADMIN'::text AS "public"."Role"),CAST('MEMBER'::text AS "public"."Role"),CAST('OWNER'::text AS "public"."Role")
        )
    ) 
LIMIT 1 OFFSET 0;

SELECT 
    "public"."Company"."id", 
    "public"."Company"."name", 
    "public"."Company"."slug", 
    "public"."Company"."domain", 
    "public"."Company"."defaultRole"::text, 
    "public"."Company"."createdAt", 
    "public"."Company"."updatedAt" 
FROM "public"."Company" 
WHERE "public"."Company"."id" IN ('386a5102-0427-403a-b6c1-877de86d1ce0') 
OFFSET 0;
*/

/*
Limit  (cost=0.00..2.06 rows=1 width=159) (actual time=0.049..0.050 rows=1 loops=1)
  ->  Nested Loop  (cost=0.00..2.06 rows=1 width=159) (actual time=0.049..0.049 rows=1 loops=1)
        Join Filter: ("CompanyMember"."companyId" = j1.id)
        ->  Seq Scan on "CompanyMember"  (cost=0.00..1.03 rows=1 width=131) (actual time=0.009..0.009 rows=1 loops=1)
              Filter: (("userId" = '34f3bc0e-e955-400b-892e-395edc6fa727'::text) AND (role = ANY (ARRAY[('ADMIN'::cstring)::"Role", ('MEMBER'::cstring)::"Role", ('OWNER'::cstring)::"Role"])))
        ->  Seq Scan on "Company" j1  (cost=0.00..1.01 rows=1 width=37) (actual time=0.009..0.009 rows=1 loops=1)
              Filter: ((id IS NOT NULL) AND (slug = 'boxyhq'::text))
Planning Time: 1.513 ms
Execution Time: 0.119 ms

Seq Scan on "Company"  (cost=0.00..1.02 rows=1 width=131) (actual time=0.041..0.042 rows=1 loops=1)
  Filter: (id = '7974330a-c8ca-4043-9e3c-3f326d1b6973'::text)
  Rows Removed by Filter: 3
Planning Time: 0.457 ms
Execution Time: 0.050 ms
*/

// Get the current user's company member object
export const getCompanyMember = async (userId: string, slug: string) => {
  return await prisma.companyMember.findFirstOrThrow({
    where: {
      userId,
      company: {
        slug,
      },
      role: {
        in: ['ADMIN', 'MEMBER', 'OWNER'],
      },
    },
    include: {
      company: true,
    },
  });
};

// Get current user with company info
export const getCurrentUserWithCompany = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const user = await getCurrentUser(req, res);

  const { slug } = validateWithSchema(companySlugSchema, req.query);

  const { role, company } = await getCompanyMember(user.id, slug);

  return {
    ...user,
    role,
    company,
  };
};
