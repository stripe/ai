import schedule from '@/app/data/schedule.json';
import Container from '@/app/components/Container';
import Image from 'next/image';
import {Badge} from '@/components/ui/badge';
import {ChevronLeft, ChevronRight, ChevronDown} from 'lucide-react';

const SCHEDULE_HEIGHT = 1440;
const MINUTES_IN_BUSINESS_DAY = 600;

const getCurrentDate = () => {
  const currentDate = new Date();
  const options = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  } as Intl.DateTimeFormatOptions;
  return currentDate.toLocaleDateString('en-US', options);
};

function getMinutesSince9AM() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const targetHour = 9; // 9 AM
  const targetMinute = 0; // 0 minutes

  let minutesSince9AM = 0;

  if (currentHour > targetHour) {
    // Calculate minutes after 9 AM
    minutesSince9AM = (currentHour - targetHour) * 60 + currentMinute;
  } else if (currentHour === targetHour) {
    // It's 9 AM or later, but before 10 AM
    minutesSince9AM = currentMinute;
  } else {
    // It's before 9 AM, so calculate minutes until tomorrow's 9 AM
    minutesSince9AM = (24 - targetHour + currentHour) * 60 - currentMinute;
  }

  return minutesSince9AM;
}

const renderDayProgressBar = () => {
  const minutesSince9AM = getMinutesSince9AM();

  if (minutesSince9AM < 0 || minutesSince9AM > MINUTES_IN_BUSINESS_DAY) {
    return null;
  }

  return (
    <div
      className="absolute left-[40px] z-30 h-[2px] w-[calc(100%-35px)] bg-accent"
      style={{
        top: `${(SCHEDULE_HEIGHT * minutesSince9AM) / MINUTES_IN_BUSINESS_DAY + 60}px`,
      }}
    >
      <div className="relative left-0 top-[-3px] h-2 w-2 rounded-full border-2 border-accent bg-accent"></div>
    </div>
  );
};

const renderHourBlock = (hour: string) => {
  return (
    <div className="flex h-36 flex-row">
      <div className="w-12 text-sm text-subdued">
        <div className="-translate-y-[50%]">{hour}</div>
      </div>
      <div className="grid flex-1 grid-cols-1 divide-y border-t-2">
        <div></div>
        <div></div>
      </div>
    </div>
  );
};

const Schedule = () => {
  return (
    <div>
      <div className="relative space-y-4">
        <div className="flex justify-between gap-2 sm:items-center">
          <h1 className="text-xl font-bold">Today&apos;s schedule</h1>
          <div className="font-bold text-accent">{getCurrentDate()}</div>
        </div>
        <div className="relative left-0 z-30 flex w-full flex-row">
          {renderDayProgressBar()}
        </div>
        <div className="ml-10 flex flex-row">
          {schedule.map(({id: id, groomer}) => (
            <h2
              key={id}
              className="ml-8 flex flex-1 flex-row items-center space-x-1 text-lg font-bold last:hidden md:last:flex"
            >
              <div>{groomer}</div>
              <ChevronDown color="#6c7688" />
            </h2>
          ))}
        </div>
        <div className="relative flex bg-screen-foreground">
          <div className="absolute z-10 w-full flex-1">
            {renderHourBlock('9 AM')}
            {renderHourBlock('10 AM')}
            {renderHourBlock('11 AM')}
            {renderHourBlock('12 PM')}
            {renderHourBlock('1 PM')}
            {renderHourBlock('2 PM')}
            {renderHourBlock('3 PM')}
            {renderHourBlock('4 PM')}
            {renderHourBlock('5 PM')}
            {renderHourBlock('6 PM')}
          </div>
          <div
            className={`relative top-0 z-20 flex h-[1440px] w-full flex-row gap-4 pl-16`}
          >
            {schedule.map(({id: id, sessions}) => {
              return (
                <div
                  key={id}
                  className="relative flex flex-grow flex-col last:hidden md:last:flex"
                >
                  {sessions.map(
                    ({
                      id: classId,
                      name,
                      startTime,
                      endTime,
                      startTimeMinutes,
                      endTimeMinutes,
                      pet,
                      petType,
                      profilePhoto,
                    }) => {
                      const badge =
                        petType == 'dog' ? (
                          <Badge variant="blue">Dog</Badge>
                        ) : (
                          <Badge variant="red">Cat</Badge>
                        );
                      return (
                        <div
                          key={classId}
                          className="hover:z-100 absolute flex w-full cursor-pointer flex-col justify-between space-y-2 rounded-md border bg-offset bg-screen-background p-3 text-primary transition duration-150 hover:scale-[1.01] hover:bg-screen-foreground hover:shadow-md"
                          style={{
                            height: `${Math.round(
                              (SCHEDULE_HEIGHT *
                                (endTimeMinutes - startTimeMinutes)) /
                                MINUTES_IN_BUSINESS_DAY
                            )}px`,
                            top: `${Math.round(
                              (SCHEDULE_HEIGHT * startTimeMinutes) /
                                MINUTES_IN_BUSINESS_DAY
                            )}px`,
                          }}
                        >
                          <div>
                            <div className="text-md font-medium text-accent">
                              {startTime} - {endTime}
                            </div>
                            <div className="text-md truncate font-medium">
                              {name}
                            </div>
                          </div>
                          <div className="text-md flex items-end gap-2">
                            <div className="relative flex flex-1 items-center gap-2 font-medium">
                              <Image
                                className="relative h-7 w-7 rounded-full border border-gray-300"
                                fill
                                quality={50}
                                sizes="100px"
                                src={`/pet_photos/${profilePhoto}.jpg`}
                                alt={`Photo of ${name}`}
                                priority
                              />
                              {pet}
                            </div>
                            {badge}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
