'use client';

import React from 'react';
import Container from './Container';
import {Badge} from '@/components/ui/badge';
import {SparkLineChart} from '@mui/x-charts/SparkLineChart';

const CustomersWidget = () => {
  return (
    <Container className="w-full px-5">
      <div className="flex flex-row justify-between gap-6">
        <div className="min-w-[110px] space-y-1">
          <h1 className="font-bold text-subdued">Customers</h1>
          <div className="flex flex-row items-center space-x-2">
            <div className="text-xl font-bold">424</div>
            <Badge className="h-6 rounded-md border-success-border bg-success pb-0 pl-1 pr-1 pt-0 text-success-foreground">
              +3.1%
            </Badge>
          </div>
        </div>
        <div className="relative w-full">
          <div className="absolute right-0 w-full max-w-[250px]">
            <SparkLineChart
              data={[0, 10, 5, 20, 10, 10, 0, 25, 25, 55, 35, 35, 40]}
              height={55}
              colors={['#23840240']}
              curve="natural"
              className="w-full"
            />
          </div>
          <div className="absolute right-0 w-full max-w-[250px]">
            <SparkLineChart
              data={[15, 20, 20, 0, 15, 30, 30, 55, 45, 45, 35, 50, 45, 55]}
              height={55}
              colors={['var(--accent)']}
              curve="natural"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default CustomersWidget;
