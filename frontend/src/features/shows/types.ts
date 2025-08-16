export interface Venue {
  venue_id: string;
  venue_name: string;
}

export interface Script {
  script_id: string;
  script_name: string;
  script_status: string;
  show_id: string;
  start_time: string;
  end_time?: string;
  date_created: string;
  date_updated: string;
  last_used?: string;
  is_shared: boolean;
}

export interface Show {
  show_id: string;
  show_name: string;
  show_date?: string;
  show_end?: string;
  date_created: string;
  date_updated: string;
  venue?: Venue;
  scripts: Script[];
}
