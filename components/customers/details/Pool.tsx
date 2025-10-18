import { Customer } from "@prisma/client";

interface PoolProps {
  customer: Customer;
}

const PoolComponent = ({ customer }: PoolProps) => {
  return (
    <div>
      <h1>{customer.firstName} {customer.lastName}&apos;s Pools</h1>

    
    </div>
  );
};

export default PoolComponent;