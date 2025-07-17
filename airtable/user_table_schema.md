# User Table Schema

This table contains all onboarding, identity, and configuration fields for each STRUKT member. It acts as the central personalisation source for AI logic, automation, and system integration.

## 🔑 Key Identifiers

- `Full Name`: Text
- `Email Address`: Text (Primary unique identifier for all linked logs and assistant access)

---

## 👤 Identity & Inclusivity

- `Gender Identity` (Single select)
- `Gender Identity (Self-Described)` (Text)
- `Pronouns` (Single select)
- `Pronouns (Self-Described)` (Text)
- `Ethnicity / Cultural Background` (Single select)
- `Ethnicity (Self-Describe)` (Text)
- `Religion / Faith` (Single select)
- `Religion (Self-Describe)` (Text)
- `Accessibility or Support Needs` (Long text)

---

## 📅 Personal Setup

- `Date of Birth`: Date
- `Start Date`: Date
- `STRUKT Tier`: Single select (e.g. Core, Pro, Elite)
- `Onboarding Complete`: Checkbox (yes/no)

---

## 🧠 Coaching & Motivation

- `Preferred Coaching Tone`: Single select
- `Anything else about how you prefer to be coached?`: Long text
- `Vision of Success`: Long text
- `AI Coach Notes`: Long text

---

## 🕒 Daily Life & Routines

- `Daily Routine`: Long text
- `Work Schedule / Commitments`: Long text
- `Preferred Workout Time`: Text
- `Preferred Reminder/Nudge Times`: Text

---

## 🧍 Body Stats

- `Height`: Number
- `Starting Weight (kg)`: Number
- `Current Weight (kg)`: Number
- `Goal Weight (kg)`: Number
- `Body Type`: Single select
- `Main Goal`: Single select

---

## 🥦 Nutrition

- `Dietary Needs/Allergies`: Multi-select
- `Medical Considerations`: Long text
- `Current Nutrition Style`: Single select
- `Current Challenges with Nutrition`: Long text
- `Nutrition Goals`: Long text
- `Food Preferences / Dietary Needs`: Multi-select
- `Cultural or Religious Food Influence`: Text
- `Do you track calories/macros?`: Yes/No
- `Generate Meal Suggestions?`: Yes/No
- `Allergies & Food Intolerances`: Multi-select

---

## 🏋️‍♂️ Training & Movement

- `Currently training?`: Yes/No
- `Current training routine`: Long text
- `Workout Preferences`: Multi-select
- `Workout Location`: Text
- `Equipment Access`: Multi-select
- `Equipment Access (repeat)`: [duplicate] — consider merging
- `Time for training weekly`: Text
- `Injuries or limitations`: Long text
- `Movement Goal`: Long text

---

## 💊 Supplements

- `Currently taking supplements?`: Yes/No
- `Current Supplements`: Text
- `Reasons for taking supplements`: Text
- `Past supplement reactions`: Text
- `Open to Supplement Suggestions`: Yes/No

---

## 🌙 Sleep

- `Typical Sleep Duration`: Number (hrs)
- `Sleep Quality`: Single select or rating
- `Usual Bedtime`: Time/text
- `Usual Wake Time`: Time/text
- `Sleep Challenges`: Long text (optional)

---

## 📋 System / Output Fields

- `Custom Plan Summary`: Long text (can be AI-generated or coach-written)
- `Charity Choice`: Single select (used for STRUKT donation support)
