'use client';

import React from 'react';
import Container from './Container';
import {Badge} from '@/components/ui/badge';
import {SparkLineChart} from '@mui/x-charts/SparkLineChart';

const MonthToDateWidget = () => {
  return (
    <Container className="w-full px-5">
      <div className="flex flex-row justify-between gap-6">
        <div className="min-w-[110px] space-y-1">
          <h1 className="font-bold text-subdued">Month-to-date</h1>
          <div className="flex flex-row items-center space-x-2">
            <div className="text-xl font-bold">$13.3k</div>
            <Badge className="h-6 rounded-md border-success-border bg-success px-1 py-0 text-success-foreground">
              +7.5%
            </Badge>
          </div>
        </div>
        <div className="relative w-full">
          <div className="absolute right-0 w-full max-w-[250px]">
            <SparkLineChart
              data={[0, 10, 25, 20, 15, 5, 30, 40, 55, 40, 45, 55]}
              height={55}
              colors={['#23840240']}
              curve="natural"
              className="right-0 w-full"
            />
          </div>
          <div className="absolute right-0 w-full max-w-[250px]">
            <SparkLineChart
              data={[5, 10, 15, 0, 20, 25, 50, 40, 35, 30, 45, 55]}
              height={55}
              colors={['var(--accent)']}
              curve="natural"
              className="right-0 w-full"
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default MonthToDateWidget;
