interface ScheduleEntry {
    time: string;
    activity: string;
  }
  
  export interface Schedule {
    monday: ScheduleEntry[];
    tuesday: ScheduleEntry[];
    wednesday: ScheduleEntry[];
    thursday: ScheduleEntry[];
    friday: ScheduleEntry[];
    saturday: ScheduleEntry[];
    sunday: ScheduleEntry[];
  }
  