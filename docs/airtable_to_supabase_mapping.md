# Airtable → Supabase Mapping (Canonical)

This file maps legacy Airtable fields to the new Supabase schema.
Use this mapping to refactor all reads/writes and to build ETL backfills.

## Users / Profile

| Airtable (User table)             | Notes (ID or Name)                | Supabase `public.user_profiles` |
|----------------------------------|-----------------------------------|----------------------------------|
| `Email`                          | (fld… or “Email”)                 | `email`                          |
| `external_id` (Firebase UID)     | (fld… or “external_id”)           | `user_id` (FK → auth.users.id)   |
| `Name`                           |                                   | `full_name`                      |
| `Timezone`                       |                                   | `timezone`                       |
| `Gender` / `Gender Identity`     |                                   | `gender_identity`                |
| `Pronouns`                       |                                   | `pronouns`                       |
| `Identity Other`                 |                                   | `identity_other`                 |
| `Cultural Practices`             | multi-select                      | `cultural_practices` (text[])    |
| `Faith/Diet Rules`               | halal/kosher/fasting…             | `faith_diet_rules` (text[])      |
| `Cultural Notes`                 |                                   | `cultural_notes`                 |
| `Obstacles`                      | travel/childcare/injury…          | `obstacles` (text[])             |
| `Work Pattern`                   | shift/9-5/freelance…              | `work_pattern`                   |
| `Support System`                 |                                   | `support_system`                 |
| `Lifestyle Notes`                |                                   | `lifestyle_notes`                |
| `Injuries`                       |                                   | `injuries` (text[])              |
| `Conditions`                     |                                   | `conditions` (text[])            |
| `Contraindications`              |                                   | `contraindications` (text[])     |
| `Emergency Ack`                  |                                   | `emergency_ack` (bool)           |
| `Primary Goal`                   |                                   | `primary_goal`                   |
| `Secondary Focus`                | multi-select                      | `secondary_goals` (text[])       |
| `Target Event`                   |                                   | `target_event`                   |
| `Target Date`                    |                                   | `target_event_date` (date)       |
| `Days/Week`                      |                                   | `days_per_week`                  |
| `Session Minutes`                |                                   | `session_minutes`                |
| `Equipment Access`               | multi-select                      | `equipment_access` (text[])      |
| `Workout Location`               | home/gym/hybrid                    | `workout_location`               |
| `Experience Level`               | beginner/intermediate/advanced    | `experience_level`               |
| `Coaching Tone`                  | gentle/direct/cheerleader/brief   | `coaching_tone`                  |
| `Learning Style`                 | text/visual/audio/step-by-step    | `learning_style`                 |
| `Height (cm)`                    |                                   | `height_cm`                      |
| `Weight (kg)`                    |                                   | `weight_kg`                      |
| `Units`                          | metric/imperial                   | `units`                          |
| `Sleep Time`                     |                                   | `sleep_time` (time)              |
| `Wake Time`                      |                                   | `wake_time` (time)               |
| `Diet Pattern`                   | vegetarian/vegan/…                | `diet_pattern`                   |
| `Fasting Pattern`                | 16:8/none/…                       | `fasting_pattern`                |
| `Diet Notes`                     |                                   | `diet_notes`                     |
| `Allergies`                      | multi-select                      | `allergies` (text[])             |
| `Intolerances`                   | multi-select                      | `intolerances` (text[])          |
| `Cuisines Liked`                 | multi-select                      | `cuisines_like` (text[])         |
| `Cuisines Avoided`               | multi-select                      | `cuisines_avoid` (text[])        |
| `Budget Band`                    | low/medium/high                   | `budget_band`                    |
| `Supplements Current (JSON)`     | JSON list                         | `supplements_current` (jsonb[])  |
| `Sleep Quality`                  |                                   | `sleep_quality`                  |
| `Avg Sleep Hours`                |                                   | `avg_sleep_hours`                |
| `Recovery Habits`               | multi-select                      | `recovery_habits` (text[])       |
| `Charity Choice`                 |                                   | `charity_choice`                 |
| `Success Definition`             |                                   | `success_definition`             |
| `Motivation Notes`               |                                   | `motivation_notes`               |
| `Onboarding Completed`           |                                   | `onboarding_completed`           |
| `Cohort`                         |                                   | `cohort`                         |
| `Data Env`                       | test/prod                         | `data_env`                       |

## Workouts

| Airtable (Workouts) | Supabase `public.workouts`     |
|---------------------|---------------------------------|
| `User` (linked)     | `user_id` (UUID → auth.users)   |
| `Type`              | `type`                          |
| `Description`       | `description`                   |
| `Duration`          | `duration_minutes`              |
| `Calories`          | `calories`                      |
| `Notes`             | `notes`                         |
| `Date`              | `date`                          |

## Meals

| Airtable (Meals) | Supabase `public.meals`      |
|------------------|------------------------------|
| `User`           | `user_id`                    |
| `Description`    | `description`                |
| `Macros` (JSON)  | `macros` (jsonb)             |
| `Calories`       | `calories`                   |
| `Notes`          | `notes`                      |
| `Date`           | `date`                       |

## Sleep Logs

| Airtable (Sleep) | Supabase `public.sleep_logs` |
|------------------|-------------------------------|
| `User`           | `user_id`                     |
| `Duration`       | `duration_minutes`            |
| `Quality`        | `quality`                     |
| `Bedtime`        | `bedtime` (timestamptz)       |
| `Wake Time`      | `wake_time` (timestamptz)     |
| `Notes`          | `notes`                       |

## Supplements

| Airtable (Supplements) | Supabase `public.supplements` |
|------------------------|--------------------------------|
| `User`                 | `user_id`                      |
| `Name`                 | `supplement_name`              |
| `Dose`                 | `dose`                         |
| `Time`                 | `time` (timestamptz)           |
| `Notes`                | `notes`                        |

## Mood Logs

| Airtable (Mood) | Supabase `public.mood_logs` |
|-----------------|-----------------------------|
| `User`          | `user_id`                   |
| `Mood Score`    | `mood_score` (1–10)         |
| `Stress Level`  | `stress_level` (1–10)       |
| `Notes`         | `notes`                      |
| `Date`          | `date`                       |

## Chat Interactions

| Airtable (Chat) | Supabase `public.chat_interactions` |
|-----------------|--------------------------------------|
| `User`          | `user_id`                            |
| `Message`       | `message`                            |
| `Response`      | `response`                           |
| `Context JSON`  | `context` (jsonb)                    |
| `Timestamp`     | `timestamp`                          |
