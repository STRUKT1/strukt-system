The id for Chat Interactions is tblDtOOmahkMYEqmy. Table ids and table names can be used interchangeably in API requests. Using table ids means table name changes do not require modifications to your API request.

Fields
Each record in the Chat Interactions table contains the following fields:

Field names and field ids can be used interchangeably. Using field ids means field name changes do not require modifications to your API request. We recommend using field ids over field names where possible, to reduce modifications to your API request if the user changes the field name later.

FIELD NAMEFIELD IDTYPEDESCRIPTION
Name fldcHOwNiQlFpwuly Text
string
A single line of text.
 
EXAMPLE VALUES
"Chat – 7/22/2025, 10:14:12 PM"
Notes fldDyieb8C10ht8oP
Link to another record
array of record IDs (strings)
Array of linked records IDs from the User table.
 
EXAMPLE VALUE
["rec8116cdd76088af", "rec245db9343f55e8", "rec4f3bade67ff565"]
User fldDtbxnE1PyTleqo
Link to another record
array of record IDs (strings)
Array of linked records IDs from the User table.
 
EXAMPLE VALUE
["rec8116cdd76088af", "rec245db9343f55e8", "rec4f3bade67ff565"]
User Email fldkDFXOrqWv8t9Sx
Lookup
array of numbers, strings, booleans, or objects
Array of Email Address fields in linked User records.
 
EXAMPLE VALUES
[
    "theresebwd@yahoo.co.uk"
]
Date/Time fld1WNv8Oj0PU0ODt Created time
string
The time the record was created in UTC, e.g. "2015-08-29T07:00:00.000Z".
 
EXAMPLE VALUES
"2025-07-22T22:14:13.000Z"
Topic fld2eLzWRUnKNR7Im
Single select
string
Selected option name.

When creating or updating records, if the choice string does not exactly match an existing option, the request will fail with an INVALID_MULTIPLE_CHOICE_OPTIONS error unless the typecast parameter is enabled. If typecast is enabled, a new choice will be created if one does not exactly match.

 
POSSIBLE VALUES
[
    "Nutrition",
    "Workout",
    "Mindset",
    "Support",
    "Other"
]
Message fldgNRKet3scJ8PIe Long text
string
Multiple lines of text, which may contain "mention tokens", e.g.
<airtable:mention id="menE1i9oBaGX3DseR">@Alex</airtable:mention>
 
EXAMPLE VALUES
"I am going to pret for my lunch at work tomorrow. Based on my goals what should I look to get for lunch?"
AI Response fld3vU9nKXNmu6OZV Long text
string
Multiple lines of text, which may contain "mention tokens", e.g.
<airtable:mention id="menE1i9oBaGX3DseR">@Alex</airtable:mention>
 
EXAMPLE VALUES
"Hey Therese, \n\nThat's great! Planning your meals ahead of time is an excellent way to support your fitness goals. 🎯 \n\nHere's a guide on what you migh..."
