# STRUKT Airtable Schema

This document provides a structured overview of all Airtable tables and key fields currently used in the STRUKT system. Each field includes its type, usage tag, and relevant notes. This is designed for reference during development and prompt engineering.

---

## 📋 Members Table

| Field Name                                 | Field Type       | Tag                  | Notes |
|-------------------------------------------|------------------|----------------------|-------|
| Full Name                                  | Single line text | AI Context           | Used in all personalisation |
| Email Address                              | Email            | AI Context, Linked   | Primary identifier |
| Gender Identity                            | Single select    | AI Context           | |
| Pronouns                                   | Single select    | AI Context           | |
| Date of Birth                              | Date             | AI Context           | |
| Body Type                                  | Single select    | AI Context           | |
| Main Goal                                  | Multi select     | AI Context           | |
| Dietary Needs                              | Multi select     | AI Context           | |
| Allergies & Food Intolerances              | Long text        | AI Context, Safety   | |
| Medical Considerations                     | Long text        | AI Context, Safety   | |
| Preferred Coaching Tone                    | Single select    | AI Tone Modifier     | Used to set assistant voice |
| Current Nutrition Style                    | Multi select     | AI Context           | |
| Current Activity Level                     | Single select    | AI Context           | |
| Workout Preferences                        | Multi select     | AI Context           | |
| Equipment Access                           | Single select    | AI Context           | |
| Supplements Currently Taking               | Long text        | AI Context           | |
| Sleep Quality                              | Single select    | AI Context           | |
| Sleep Duration                             | Number           | AI Context           | |
| Vision of Success                          | Long text        | AI Context, Motivational | |
| Chosen Charity                             | Single select    | Personal/Optional    | |
| Onboarding Complete                        | Checkbox         | Logic Trigger        | Triggers plan generation |
| Custom Plan Summary                        | Long text        | AI Output            | Generated plan text |
| Custom Workout Plan                        | Long text        | AI Output            | Training breakdown |

---

## 💬 Chat Interactions Table

| Field Name        | Field Type      | Tag             | Notes |
|------------------|-----------------|------------------|-------|
| Name              | Single line     | System use       | |
| User              | Linked record   | Relational       | Links to Members |
| User Email        | Lookup          | Relational       | |
| Message           | Long text       | AI Input Log     | |
| AI Response       | Long text       | AI Output Log    | |
| Topic             | Single select   | AI Context       | Auto-tagged via API |
| Date/Time         | Created time    | Timestamp        | |

---

## 🍽️ Meals Table (planned)

| Field Name        | Field Type      | Tag             | Notes |
|------------------|-----------------|------------------|-------|
| User              | Linked record   | Relational       | |
| Meal Name         | Single line     | Log Field        | |
| Calories          | Number          | AI Context       | |
| Protein / Carbs / Fats | Number     | AI Context       | |
| Meal Time         | DateTime        | Tracking         | |
| Notes             | Long text       | Optional         | |
| Photo             | Attachment      | Vision Support   | |

---

## 🏋️ Workouts Table (planned)

| Field Name        | Field Type      | Tag             | Notes |
|------------------|-----------------|------------------|-------|
| User              | Linked record   | Relational       | |
| Workout Name      | Single line     | Log Field        | |
| Exercises         | Long text       | Log Field        | |
| Duration          | Number (min)    | Tracking         | |
| Intensity         | Single select   | AI Context       | |
| Notes             | Long text       | Optional         | |

---

## 🌙 Sleep Log Table (planned)

| Field Name        | Field Type      | Tag             | Notes |
|------------------|-----------------|------------------|-------|
| User              | Linked record   | Relational       | |
| Sleep Duration    | Number (hrs)    | Tracking         | |
| Sleep Quality     | Single select   | AI Context       | |
| Bedtime / Wake    | DateTime        | Log Fields       | |
| Notes             | Long text       | Optional         | |

---

## 🧠 Mood Log Table (planned)

| Field Name        | Field Type      | Tag             | Notes |
|------------------|-----------------|------------------|-------|
| User              | Linked record   | Relational       | |
| Mood              | Single select   | AI Context       | |
| Energy Level      | Single select   | AI Context       | |
| Notes             | Long text       | Optional         | |

---

_Last updated: 2025-07-23_

