'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

type SubNavProps = {
  base: string;
  routes: SubNavItem[];
};

type SubNavItem = {
  path: string;
  label: string;
};

export default function SubNav({base, routes}: SubNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex space-x-2">
      {routes.map(({path, label}, index) => {
        return (
          <Link
            key={index}
            href={path}
            className={`${
              path === pathname
                ? 'border bg-screen-foreground font-bold text-accent'
                : 'font-medium hover:bg-gray-200/80 dark:hover:bg-screen-foreground'
            } transition-color rounded-md p-2`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
