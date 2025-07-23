
## 📁 Airtable Tables Update — Custom Plans + Progress Tracker

---

### 🧱 `Custom Plans` Table (ID: `tblmnjDDlL3DnoK9X`)

Stores the AI-generated Nutrition + Workout plans for each member.

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fldH2XucnsVaXHt9T` | Text | Record label (unused by AI) |
| User | `fldEaunj6tLabY8Ds` | Link to `Users` | Primary member link |
| User Email | `fldE1S4IMG30XdByV` | Link to `Users` | Backup link for email lookup |
| Email Address (from User Email) | `fldEtdBbhgNBik8eS` | Lookup | For prompt/email reference |
| Nutrition Plan | `fldByvKxLzbrAd7xR` | Long text | Full plan text from OpenAI |
| Workout Plan | `fldhG7I2cP1UQKElg` | Long text | Weekly or structured workouts |
| Plan Summary | `fldBUCjLBAP4yEZfX` | Long text | Short overview |
| Created Time | `fldPug5czaNJhFsjL` | Created time | Auto-generated timestamp |
| Plan Delivered? | `fldUY2s4Png8Rqm2K` | Checkbox | If plan has been seen |
| Replan Requested? | `fldgFB6qG4Ia9cCrE` | Checkbox | Used to trigger updates |

---

### 📊 `Progress Tracker` Table (ID: `tblb1mW4WwWKQKG52`)

Logs weight, photos, and energy — used for graphs + AI memory.

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fldGjkSIUcRceOwkw` | Text | Entry label (optional) |
| User | `fldbJpD80SUGWK1II` | Link to `Users` | Primary member reference |
| User Email | `fldwtr70esyzJ0Y4n` | Link to `Users` | Backup link for email |
| Email Address (from User Email) | `fldeKVVHdRRJJ52dZ` | Lookup | Lookup from linked user |
| Date | `fldvdyv9msTRwTlpf` | Date | Log date |
| Weight (kg) | `fldS3BWKHMibuWsKJ` | Number | Bodyweight log |
| Waist Circumference (cm) | `fld1HitjD2Atdj1MF` | Number | Optional body log |
| Progress Photo | `fldICIJ8pYvPd6R98` | Attachment | Front/side/back uploads |
| Energy Rating (1–10) | `fld3fE5DmQiDLMgDs` | Number | Subjective rating |
| Notes | `fld4Upl8wmSjjy5nb` | Long text | Optional journal entry |

---

✅ **Best Practice**: These tables are now ready to connect to AI Coach logging and smart analysis. You can trigger feedback based on changes, trends, or missed check-ins.
