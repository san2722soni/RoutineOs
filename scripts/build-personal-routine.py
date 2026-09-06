from pathlib import Path
import json, datetime, math
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'supabase/routine-video-catalog.json').read_text(encoding='utf-8'))
areas=['Physics','DSA','JavaScript','SQL','Networking','System Design','System Design Practice','Development','Gym','Karate','Punching','Recovery','Leisure']
colors=['#F59E0B','#38BDF8','#FACC15','#60A5FA','#22D3EE','#A78BFA','#C084FC','#34D399','#FB7185','#F97316','#F472B6','#94A3B8','#A3E635']
resources=[]
for r in catalog:
 if r.get('error'): raise ValueError(f"Video metadata unavailable: {r['area']}")
 items=[]
 for i,item in enumerate(r['items']):
  if r['area']=='JavaScript' and r['type']=='youtube-playlist' and item['id']=='a-wVHL0lpb0': continue
  # Chunk long JS follow-up lessons so an eight-hour video is not assigned to one block.
  parts=math.ceil(item['durationSeconds']/1800) if r['area']=='JavaScript' and r['type']=='youtube-playlist' else 1
  for part in range(parts):
   x=dict(item); x.pop('resourceId',None)
   if parts>1:
    start=part*1800
    x.update(id=f"{item['id']}-part-{part+1}",title=f"{item['title']} / part {part+1} of {parts}",url=f"https://www.youtube.com/watch?v={item['id']}&t={start}s",durationSeconds=min(1800,item['durationSeconds']-start))
   x['order']=len(items)
   x['completed']=(r['area']=='DSA' and i<14) or (r['area']=='SQL' and i<2) or (r['area']=='JavaScript' and r['type']=='youtube-video' and i<4)
   if x['completed']: x['completedAt']='2026-09-07T00:00:00Z'
   items.append(x)
 resources.append(dict(area=r['area'],type=r['type'],url=r['url'],title=f"{r['area']} / {'30-minute lessons' if r['type']=='youtube-video' else 'course'}",items=items))
# Single-video JS foundation must come before its follow-up playlist.
resources.sort(key=lambda r:(areas.index(r['area']),r['type']=='youtube-playlist'))
def block(start,end,area,title): return dict(start=start,end=end,categoryId=area,label=title)
def schedule(phase,day):
 b=[]
 def add(s,e,a,t):b.append(block(s,e,a,t))
 add('05:30','05:45','Recovery','Wake up, water and get ready')
 if phase=='exam-day':
  add('05:45','06:30','Physics','Light review only')
  add('06:30','07:30','Recovery','Breakfast, documents and preparation')
  add('07:30','19:00','Physics','EXAM DAY RESERVED - follow admit-card time; includes travel, meals and rest')
  add('19:00','20:00','Recovery','Dinner and recovery')
  add('20:00','21:00','Leisure','Relax after the exam')
 elif day==0:
  add('05:45','06:30','Recovery','Breakfast and get ready')
  add('06:30','07:00','Recovery','Travel to karate')
  add('07:00','10:00','Karate','Karate class - include punching technique')
  add('10:00','11:00','Recovery','Travel, bath and recovery meal')
  add('11:00','12:30','Physics' if phase=='exam' else 'DSA','Physics practice' if phase=='exam' else 'DSA revision and approach notes')
  add('12:30','14:00','Recovery','Lunch and rest')
  add('14:00','15:30','Physics' if phase=='exam' else 'Development','Physics revision' if phase=='exam' else 'Weekly review and interview practice')
  add('15:30','18:30','Leisure','Movie, game or friends - choose one')
  add('18:30','19:30','Recovery','Dinner and family')
  add('19:30','21:00','Recovery','Prepare the week and relax')
 else:
  add('05:45','08:15','Physics' if phase=='exam' else 'DSA','Physics study' if phase=='exam' else 'DSA learning, solving and approach notes')
  add('08:15','09:00','Recovery','Breakfast and bath')
  add('09:00','10:30','DSA' if phase=='exam' else 'JavaScript','DSA maintenance and practice' if phase=='exam' else 'JavaScript learning and implementation')
  add('10:30','10:45','Recovery','Walk and break')
  course={1:'SQL',2:'Networking',3:'Networking',4:'System Design',5:'Networking',6:'System Design Practice'}[day]
  add('10:45','12:00' if phase=='exam' else '11:45','Physics' if phase=='exam' else course,'Physics questions and revision' if phase=='exam' else course+' learning and practice')
  add('12:00' if phase=='exam' else '11:45','13:00','Development','Essential client work' if phase=='exam' else 'Client or portfolio development')
  add('13:00','14:00','Recovery','Lunch and rest')
  add('14:00','15:30','Physics' if phase=='exam' else 'Development','Physics practice and correction' if phase=='exam' else 'Build, debug and test')
  add('15:30','16:00','Recovery','Snack and movement break')
  if day==3:
   add('16:00','16:30','Recovery','Get ready and travel')
   add('16:30','17:00','Recovery','Karate warm-up and arrival buffer')
   add('17:00','19:00','Karate','Karate class - include punching technique')
   add('19:00','20:00','Recovery','Travel, bath and dinner')
   add('20:00','21:00','Leisure','One episode or light gaming')
  else:
   add('16:00','17:00','JavaScript' if phase=='exam' and day in [1,4,5] else 'Development','Light JavaScript practice' if phase=='exam' and day in [1,4,5] else 'Work buffer, practice and wrap-up')
   if day in [2,4,5]:
    add('17:00','17:15','Recovery','Travel and gym warm-up')
    add('17:15','17:45' if day==2 else '18:00','Gym',{2:'Short upper-body strength - leave reps in reserve',4:'Lower-body and shoulders - moderate effort',5:'Upper-body and light lower-body strength'}[day])
    if day==2:
     add('17:45','18:00','Recovery','Travel to karate - assumed 15 minutes')
     add('18:00','20:00','Karate','Karate class - include punching technique')
    else:
     add('18:00','18:15','Recovery','Travel and reset')
     add('18:15','18:45','Punching','Easy bag technique - not all-out rounds')
     add('18:45','20:00','Recovery','Bath, dinner and family')
   elif day==6:
    add('17:00','18:00','Recovery','Snack, travel and warm-up')
    add('18:00','20:00','Karate','Karate class - include punching technique')
   else:
    add('17:00','17:30','Punching','Optional easy technique - Monday recovery day')
    add('17:30','19:00','Leisure','Game, episode or friends')
    add('19:00','20:00','Recovery','Dinner and family')
   add('20:00','21:00','Recovery' if day in [2,6] else 'Leisure','Travel, bath and dinner' if day in [2,6] else 'Leisure - choose one')
 add('21:00','21:30','Recovery','Screens off and wind down')
 return b
names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
templates=[]
for phase in ['exam','career']:
 for day in range(7):templates.append(dict(key=f'{phase}-{day}',name=f"{'Physics priority' if phase=='exam' else 'Career preparation'} / {names[day]}",dayRules=[] if phase=='exam' else [day],blocks=schedule(phase,day)))
templates.append(dict(key='exam-day',name='22 September / exam day',dayRules=[],blocks=schedule('exam-day',2)))
for t in templates:
 previous=0;total=0
 for b in t['blocks']:
  start,end=[sum(int(v)*m for v,m in zip(b[k].split(':'),[60,1])) for k in ['start','end']]
  assert previous<=start<end,(t['key'],b)
  previous=end;total+=end-start
 assert total<=1080
payload=dict(areas=[dict(label=a,color=c) for a,c in zip(areas,colors)],resources=resources,templates=templates)
header='''-- Personalized RoutineOS seed: invictusasw7@gmail.com
-- Run the current schema.sql first, in Supabase SQL Editor (admin).
-- Dates: today in Asia/Kolkata through 7 December 2026; never creates past days.
-- Sign OUT of the app after a successful backup BEFORE running; sign in afterward.
-- Replaces UNSTARTED plans in this date window. Days with execution records or
-- non-pending blocks are preserved. Existing library items and completion are retained.
-- No auth accounts, reminders, locations, history or profile preferences are deleted.
-- Routines/areas/videos are preloaded; only daily_plans has a lock state in this app.
-- Exam-day 07:30-19:00 is a reservation, NOT an asserted exam time. Use admit card.
-- All schedule times are IST. Sleep 21:30-05:30 is outside the app's daytime blocks.
-- One transaction: any failure rolls the entire seed back. Reruns retain video progress.
DO $seed$
DECLARE
 target_email text := 'invictusasw7@gmail.com';
 first_day date := greatest((now() at time zone 'Asia/Kolkata')::date, date '2026-09-07');
 last_day date := date '2026-12-07';
 uid uuid; cid uuid; rid uuid; tid uuid; pid uuid; existing_id uuid;
 area_map jsonb := '{}'; template_map jsonb := '{}'; queues jsonb := '{}'; cursors jsonb := '{}';
 payload jsonb := $payload$
'''
body='''
$payload$::jsonb;
 a jsonb; r jsonb; t jsonb; b jsonb; i jsonb; old_items jsonb;
 resource_items jsonb; template_blocks jsonb; plan_blocks jsonb; picks jsonb;
 d date; k text; area text; offset_n integer; take_n integer; n integer;
 inserted_days integer := 0; preserved_days integer := 0;
BEGIN
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(target_email) LIMIT 1;
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in once as % before running this seed.',target_email; END IF;
 IF first_day>last_day THEN RAISE EXCEPTION 'This dated plan ends on 7 December 2026. Update dates before using it later.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 INSERT INTO public.profiles(id,display_name,onboarding_completed) VALUES(uid,'Aswin',true)
 ON CONFLICT(id) DO NOTHING;
 FOR a IN SELECT value FROM jsonb_array_elements(payload->'areas') LOOP
  SELECT id INTO cid FROM public.categories WHERE user_id=uid AND lower(label)=lower(a->>'label');
  IF cid IS NULL THEN
   cid := md5(uid::text||':career-2026:area:'||(a->>'label'))::uuid;
   INSERT INTO public.categories(id,user_id,label,color) VALUES(cid,uid,a->>'label',a->>'color');
  END IF;
  DELETE FROM public.deleted_records WHERE user_id=uid AND table_name='categories' AND record_id=cid::text;
  area_map := area_map || jsonb_build_object(a->>'label',cid::text);
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(payload->'resources') LOOP
  area := r->>'area'; cid := (area_map->>area)::uuid;
  SELECT id,items INTO rid,old_items FROM public.resources WHERE user_id=uid AND category_id=cid AND type=r->>'type';
  IF rid IS NULL THEN rid := md5(uid::text||':career-2026:resource:'||area||':'||(r->>'type'))::uuid; END IF;
  resource_items := '[]';
  FOR i IN SELECT value FROM jsonb_array_elements(r->'items') LOOP
   -- Keep a previously recorded completion (including a deliberate undo).
   i := i || coalesce((SELECT value FROM jsonb_array_elements(coalesce(old_items,'[]')) WHERE value->>'id'=i->>'id' LIMIT 1),'{}');
   i := i || jsonb_build_object('resourceId',rid::text);
   resource_items := resource_items || jsonb_build_array(i);
  END LOOP;
  -- Keep unrelated items already in this category's same-type resource.
  resource_items := resource_items || coalesce((SELECT jsonb_agg(value) FROM jsonb_array_elements(coalesce(old_items,'[]')) old
   WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(resource_items) new WHERE new->>'id'=old.value->>'id')),'[]');
  INSERT INTO public.resources(id,user_id,category_id,title,type,url,chunk_minutes,items)
  VALUES(rid,uid,cid,r->>'title',r->>'type',r->>'url',30,resource_items)
  ON CONFLICT(id) DO UPDATE SET items=excluded.items,updated_at=now();
  DELETE FROM public.deleted_records WHERE user_id=uid AND table_name='resources' AND record_id=rid::text;
  FOR i IN SELECT value FROM jsonb_array_elements(resource_items) WHERE NOT coalesce((value->>'completed')::boolean,false) LOOP
   queues := jsonb_set(queues,ARRAY[area],coalesce(queues->area,'[]') || jsonb_build_array(
    (i-'completed'-'completedAt') || jsonb_build_object('categoryId',cid::text,'resourceTitle',r->>'title')));
  END LOOP;
 END LOOP;
 FOR t IN SELECT value FROM jsonb_array_elements(payload->'templates') LOOP
  tid := md5(uid::text||':career-2026:template:'||(t->>'key'))::uuid;
  template_blocks := '[]'; n:=0;
  FOR b IN SELECT value FROM jsonb_array_elements(t->'blocks') LOOP
   n:=n+1;
   template_blocks:=template_blocks||jsonb_build_array(b||jsonb_build_object('id',tid::text||'-'||n,'categoryId',area_map->>(b->>'categoryId')));
  END LOOP;
  INSERT INTO public.routine_templates(id,user_id,name,description,day_rules,blocks)
  VALUES(tid,uid,t->>'name','Career preparation September-December 2026. Sleep 21:30-05:30. See PERSONAL_ROUTINE.md.',
   ARRAY(SELECT value::integer FROM jsonb_array_elements_text(t->'dayRules')),template_blocks)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,day_rules=excluded.day_rules,blocks=excluded.blocks,updated_at=now();
  DELETE FROM public.deleted_records WHERE user_id=uid AND table_name='routine_templates' AND record_id=tid::text;
  template_map:=template_map||jsonb_build_object(t->>'key',tid::text);
 END LOOP;
 FOR d IN SELECT generate_series(first_day,last_day,interval '1 day')::date LOOP
  -- Reruns must never erase completed work or execution history.
  IF EXISTS(SELECT 1 FROM public.execution_events WHERE user_id=uid AND date_key=d)
   OR EXISTS(SELECT 1 FROM public.daily_plans p,jsonb_array_elements(p.blocks) x WHERE p.user_id=uid AND p.date_key=d AND coalesce(x->>'status','pending')<>'pending') THEN
   preserved_days:=preserved_days+1; CONTINUE;
  END IF;
  k:=CASE WHEN d=date '2026-09-22' THEN 'exam-day' WHEN d<date '2026-09-22' THEN 'exam-'||extract(dow FROM d)::integer ELSE 'career-'||extract(dow FROM d)::integer END;
  tid:=(template_map->>k)::uuid;
  SELECT value INTO t FROM jsonb_array_elements(payload->'templates') WHERE value->>'key'=k;
  plan_blocks:='[]'; n:=0;
  FOR b IN SELECT value FROM jsonb_array_elements(t->'blocks') LOOP
   n:=n+1; area:=b->>'categoryId';
   -- Finish SQL in early Mon/Wed/Fri slots, then use the regular weekly rotation.
   IF area='Networking' AND d<date '2026-10-05' AND extract(dow FROM d) IN (3,5) THEN area:='SQL'; b:=b||jsonb_build_object('label','SQL learning and practice'); END IF;
   IF area='SQL' AND d>=date '2026-10-05' THEN area:='System Design'; b:=b||jsonb_build_object('label','System design practice'); END IF;
   cid:=(area_map->>area)::uuid; picks:='[]';
   IF queues ? area AND b->>'start'<>'16:00' AND NOT (extract(dow FROM d)=0 AND area='DSA') THEN
    offset_n:=coalesce((cursors->>area)::integer,0);
    take_n:=CASE WHEN area='DSA' AND d<date '2026-09-22' THEN 1 WHEN area='JavaScript' THEN 1 ELSE 2 END;
    SELECT coalesce(jsonb_agg(value ORDER BY ordinal),'[]') INTO picks FROM jsonb_array_elements(queues->area) WITH ORDINALITY q(value,ordinal) WHERE ordinal>offset_n AND ordinal<=offset_n+take_n;
    cursors:=cursors||jsonb_build_object(area,offset_n+jsonb_array_length(picks));
   END IF;
   plan_blocks:=plan_blocks||jsonb_build_array(jsonb_build_object(
    'id',d::text||'-'||tid::text||'-'||n,'templateBlockId',tid::text||'-'||n,'categoryId',cid::text,
    'start',b->>'start','end',b->>'end','title',b->>'label',
    'goal',CASE WHEN area='DSA' THEN 'Solve independently; write a short approach note. Revisit unfinished problems.' WHEN area='Physics' THEN 'Study, practise and correct mistakes within this block.' WHEN area='Development' THEN 'Finish one reviewable piece of work; test it.' WHEN queues ? area THEN 'Learn and apply; use remaining time for practice.' ELSE b->>'label' END,
    'notes',CASE WHEN k='exam-day' THEN 'Reservation only. Admit-card reporting and exam times override this block; no gym or karate today.' ELSE 'Video selections are a pacing guide, not a deadline. Continue unfinished material before new lessons. Take short breaks inside long study blocks.' END,
    'resourceItemIds',(SELECT coalesce(jsonb_agg(value->>'id'),'[]') FROM jsonb_array_elements(picks)),
    'resourceItems',picks,'status','pending'));
  END LOOP;
  SELECT id INTO existing_id FROM public.daily_plans WHERE user_id=uid AND date_key=d;
  pid:=coalesce(existing_id,md5(uid::text||':career-2026:day:'||d::text)::uuid);
  INSERT INTO public.daily_plans(id,user_id,date_key,template_id,status,blocks,locked_at)
  VALUES(pid,uid,d,tid,'locked',plan_blocks,now())
  ON CONFLICT(user_id,date_key) DO UPDATE SET template_id=excluded.template_id,status='locked',blocks=excluded.blocks,locked_at=now(),updated_at=now();
  DELETE FROM public.deleted_records WHERE user_id=uid AND table_name='daily_plans' AND record_id=pid::text;
  inserted_days:=inserted_days+1;
 END LOOP;
 RAISE NOTICE 'Seeded % locked days; preserved % days with recorded work. Sign back in to load cloud data.',inserted_days,preserved_days;
END $seed$;
'''
# Pretty-print records without producing thousands of tiny metadata lines.
encoded=json.dumps(payload,ensure_ascii=True,separators=(',',':')).replace('},{','},\n{')
(ROOT/'supabase/seed_personal_routine.sql').write_text(header+encoded+body,encoding='utf-8')
# Keep the tables generated from exactly the same time blocks as the SQL.
md='''# Aswin's routine: 7 September-7 December 2026

All times are Asia/Kolkata (IST). The SQL starts on the day you run it, never before 7 September, and ends on 7 December. Eight hours of sleep: **21:30-05:30 every day**. Meals, travel and breaks are included. Longer study blocks include short breaks; they are not uninterrupted screen time.

## Your complete goal inventory

- NIOS Physics: prepare for your stated 22 September 2026 exam. No physics chapter screenshot was present in the supplied attachment, so this plan does not invent chapters or an exam reporting time.
- DSA: Apna College / Shraddha Khapra, 14 of 144 done; 130 remaining. Solve independently and keep your one-page approach notes.
- JavaScript: Sheryians JS Domination, first long video 2 hours complete; continue its remaining ~6 hours, then the rest of the playlist. Build things while learning.
- SQL: Apna College, 1 hour complete; resume at 01:00:00. The supplied URL timestamp was later than your stated progress, so it is not used as your resume position.
- Networking: Chai aur Code, 49 videos currently returned by YouTube.
- System design: Gaurav Sen (26 videos), then Piyush Garg (14 videos) for reinforcement. Your earlier text mentioned Piyush Jain, but no link was supplied; no extra course is invented.
- Client/self-development work, a reviewable portfolio project, debugging/testing practice and interview preparation for a potential referral in three months.
- Gym, the four fixed karate classes, punching technique, meals and recovery.
- Watchlist: The Boys S5, Stranger Things S5, Vinland Saga and 3-4 movies. This records your list, not a statement about availability.
- Play Metal Gear Solid V; keep friends/family time. Choose one leisure activity per slot.

## Priorities and pacing

| Dates | Priority | Use the schedule this way |
|---|---|---|
| 7-21 September | Physics first | About 5.25 hours Physics on weekdays, 1.5 hours DSA maintenance, only essential client work; light JS on Mon/Thu/Fri |
| 22 September | Exam and recovery | Entire daytime reserved; replace the reservation with the actual admit-card time mentally. Skip gym/karate. |
| 23 September-4 October | Coding foundations | DSA + JavaScript daily, finish SQL, resume networking and system design; apply concepts in project blocks |
| 5 October-15 November | Build and practise | Monday SQL slot becomes system design; continue independent DSA and working software, not only videos |
| 16 November-7 December | Interview readiness | Use the same development slots for timed practice, mock interviews, project explanation and portfolio polish |

DSA pacing is roughly 1 lesson per weekday before the exam and up to 2 afterward, with Sunday revision. That is enough calendar capacity for the remaining 130 lessons, but independent problem-solving decides when to move on. Daily video selections are suggestions, not proof of mastery. Long JavaScript videos are divided into 30-minute entries. If you fall behind, use the work buffer; do not take time from sleep. Finishing playlists alone cannot guarantee job readiness or a referral.

## Full timetable

'''
for phase in ['exam','career']:
 md+=f"### {'Before the exam: 7-21 September' if phase=='exam' else 'After the exam: 23 September-7 December'}\n\n"
 for day in [1,2,3,4,5,6,0]:
  md+=f"**{names[day]}**\n\n| Time | Activity |\n|---|---|\n"
  for b in schedule(phase,day):
   label=b['label']
   if phase=='career' and b['categoryId']=='Networking' and day in [3,5]: label='SQL through 4 October; networking from 5 October'
   if phase=='career' and b['categoryId']=='SQL': label='SQL through 4 October; system design from 5 October'
   md+=f"| {b['start']}-{b['end']} | {label} |\n"
  md+='| 21:30-05:30 | Sleep (8 hours) |\n\n'
md+='''### 22 September exception

The SQL reserves 07:30-19:00 for the exam day, including travel, food and rest. **This is not the exam's actual time.** Your admit card controls reporting, departure and exam timing. Light review 05:45-06:30; breakfast/preparation 06:30-07:30; dinner/recovery 19:00-20:00; relax 20:00-21:00; wind down 21:00-21:30; sleep as usual.

## Training decisions

- Monday stays a gym rest day. Its 30-minute technique block is optional and easy; skip it for a full rest day when tired.
- Gym is reduced from five days to **Tuesday, Thursday and Friday** because karate already occupies nine hours weekly. Wednesday and Saturday have no gym. Thursday covers legs/shoulders; Friday includes a light lower-body exposure alongside upper body. Exact exercise selection should reflect soreness and karate demands.
- Tuesday's short gym session before karate can be workable if you arrive fresh enough to keep technique and sparring control. This is a scheduling judgment, not a guarantee about your recovery. Keep effort moderate; if it makes karate sloppy, move/skip the gym session. Fifteen minutes is assumed for gym-to-karate travel; shorten gym if the real trip is longer.
- Do not train shoulders hard every day or take every set to failure. Pressing and punching already load them. ACSM's 2026 review says failure is not consistently necessary for the average healthy adult; individualize the workload. [ACSM guidance](https://acsm.org/resistance-training-guidelines-update-2026/).
- Your requested daily 30-minute bag work is deliberately adjusted: light bag technique Thu/Fri, optional easy technique Monday, and punching practice within karate on class days. A separate hard bag workout on top of every class is not scheduled. Ask your coach to include that technique time; class content may vary.
- Eight hours replaces the six hours from 23:00-05:00. CDC recommends at least seven hours for adults 18-60 and eight to ten for teens 13-17. If you need more, shorten work/leisure rather than force an earlier alarm. [CDC sleep guidance](https://www.cdc.gov/sleep/about/index.html).

## Leisure without sacrificing sleep

Monday has 17:30-19:00 plus 20:00-21:00; Wednesday, Thursday and Friday have 20:00-21:00; Sunday has 15:30-18:30. Use Sunday's long slot for a movie or MGS V; rotate one series through shorter slots. No obligation to finish every show and the game in three months. During exam preparation, keep these as recovery, not late-night binges.

## Load into RoutineOS

1. Back up the app successfully, then sign out **before** running SQL so a stale local snapshot cannot race the seed.
2. In Supabase SQL Editor, run the project's current `schema.sql` if not already applied, then `seed_personal_routine.sql`. The account `invictusasw7@gmail.com` must have signed in at least once. The file resolves its actual auth UUID; it does not create or change an account.
3. Sign in again on the phone while online. The app loads the cloud snapshot. The seed has not been executed on your live database by Codex.

Creates 13 areas, 7 video resources, 15 templates (seven exam-priority, seven career, one exam day), and locked dated plans from today through 7 December. Today uses the same daily-plan data as Plan. Only daily plans have a `locked` field; Library areas, routines and videos remain normally editable. Sleep is outside daytime plan blocks to respect the app's 18-hour cap. Templates retain the regular weekly rotation; dated plans use SQL on Mon/Wed/Fri through 4 October, then system design on Mondays and networking on Wed/Fri.

**Data effects:** replaces unstarted plans within the date window, including today's unstarted plan. Any day with an execution event or a non-pending block is preserved, so an already-started Today will retain its existing plan. Existing profile preferences, reminders, places, historical days and unrelated library records remain. Same-name areas and same-area/same-type resources are reused; existing resource completion wins over the initial reported progress. Rerunning refreshes pending plans and retains recorded work. Download a database backup first if you want to retain old unstarted plans too. All writes are transactional and account-scoped.

All video titles and durations were fetched from the supplied YouTube links. The companion `routine-video-catalog.json` is the fetched source metadata, not credentials. `scripts/build-personal-routine.py` regenerates the SQL and this document; `scripts/fetch-routine-videos.cjs` refreshes metadata using the existing environment key without embedding it in outputs. API playlist contents can change later.
'''
(ROOT/'PERSONAL_ROUTINE.md').write_text(md,encoding='utf-8')
print(f"Generated SQL and routine tables: {len(templates)} templates, {len(resources)} resources, {sum(len(r['items']) for r in resources)} video entries.")
