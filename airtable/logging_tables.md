# Logging Tables Overview

These tables store user-submitted logs and connect to their Member record via `Email`.

---

## `meals` Table

| Field            | Type         | Notes                             |
|------------------|--------------|------------------------------------|
| Date             | Date         |                                  |
| Email Address    | Linked field | Links to Members table           |
| Meal Type        | Single select | (Breakfast, Lunch, Snack, etc.) |
| Description      | Long text    | Free text / AI-suggested format |
| Calories         | Number       | Optional / AI-estimated          |
| Protein (g)      | Number       | Optional                         |

---

## `workouts` Table

| Field            | Type         | Notes                             |
|------------------|--------------|------------------------------------|
| Date             | Date         |                                  |
| Email Address    | Linked field | Links to Members table           |
| Workout Type     | Single select | (Weights, Cardio, Yoga, etc.)   |
| Description      | Long text    | Details or summary               |
| Duration (min)   | Number       |                                  |
| Sets / Reps      | Text         | Optional                         |

---

## `sleep_logs` Table

| Field            | Type         | Notes                             |
|------------------|--------------|------------------------------------|
| Date             | Date         |                                  |
| Email Address    | Linked field |                                  |
| Duration (hrs)   | Number       |                                  |
| Quality          | Rating / Single select |                          |
| Notes            | Long text    |                                  |
