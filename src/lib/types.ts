export type RepeatKind = 'none' | 'weekly' | 'biweekly' | 'weekdays' | 'daily';

export interface UsosEvent {
  src: 'usos';
  uid: string;
  skey: string;
  code: string;
  name: string;
  group: string;
  url: string;
  unit: string;
  start: Date;
  end: Date;
  room: string;
  building: string;
}

export interface Override {
  dow?: number | string;
  date?: string;
  from?: string;
  to?: string;
  room?: string;
  building?: string;
  note?: string;
  cancelled?: boolean;
  cDow?: number;
  cFrom?: string;
  cTo?: string;
}
export interface Overrides {
  single: Record<string, Override>;
  series: Record<string, Override>;
}

export interface CustomEvent {
  id: string;
  title: string;
  date: string;
  from: string;
  to: string;
  repeat: RepeatKind;
  days?: number[];
  until: string;
  place: string;
  color: string;
}

export interface Absence {
  uid: string;
  skey: string;
  code: string;
  name: string;
  group: string;
  at: string;
}

export interface GroupRef {
  unit_id: string | number;
  group_number: string | number;
}
export type ApiSource =
  | { kind: 'groups'; course_id?: string; groups: GroupRef[] }
  | { kind: 'staff'; user_id: string }
  | { kind: 'common'; user_id: string }
  | { kind: 'account' };

export interface Profile {
  id: string;
  name: string;
  url?: string;
  synced?: number | null;
  ci?: number;
  api?: ApiSource;
}

export type ChangeKind = 'removed' | 'added' | 'room' | 'time' | 'moved';
export interface EventJson {
  uid: string;
  skey: string;
  code: string;
  name: string;
  group: string;
  url: string;
  room: string;
  building: string;
  start: string;
  end: string;
}
export interface ChangeSide {
  start?: string;
  end?: string;
  room?: string;
}
export interface Change {
  id: string;
  at: number;
  kind: ChangeKind;
  ack: boolean;
  ev: EventJson;
  before: ChangeSide | null;
  after: ChangeSide | null;
}

export interface PlanVersion {
  at: number;
  source?: string;
  n: number;
  ics: string;
}

export interface Collisions {
  on: boolean;
  own: boolean;
  transfer: number;
}

export interface PeerData {
  key: string;
  usos: UsosEvent[];
  custom: CustomEvent[];
  ov: Overrides;
}

export type Mod = 'day' | 'time' | 'room';

export interface ViewEvent {
  src: 'usos' | 'own';
  who: 'a' | 'b';
  off: boolean;
  name: string;
  code: string;
  start: Date;
  end: Date;
  mod: Set<Mod>;
  lane: number;
  lanes: number;
  clash: boolean;
  skip: string;
  cancelled?: boolean;
  uid?: string;
  skey?: string;
  group?: string;
  url?: string;
  unit?: string;
  room?: string;
  building?: string;
  orig?: UsosEvent;
  note?: string;
  ghost?: boolean;
  srv?: Change;
  absent?: boolean;
  id?: string;
  color?: string;
  place?: string;
  repeat?: RepeatKind;
  rep?: string;
}

export interface Gap {
  from: Date;
  to: Date;
  min: number;
  move: string;
  tight: boolean;
}

export interface Conflict {
  day: number;
  d: Date;
  kind: 'overlap' | 'move';
  a: ViewEvent;
  b: ViewEvent;
  min?: number;
}

export interface GroupMeta {
  l: { id: string; n: string }[];
  ct?: string;
  t: number;
}

export interface DayView {
  date: Date;
  list: ViewEvent[];
}
export interface WeekView {
  all: ViewEvent[];
  mine: ViewEvent[];
  wk: ViewEvent[];
  nDays: number;
  days: DayView[];
  conflicts: Conflict[];
}
