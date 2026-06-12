- [x] add app layout
- [x] add brand assets
- [x] integrate logo into login
- [x] add color tokens
- [x] table schema
- [x] meal planner
- [x] implement dutch locale
- [x] why do we have two runtime config values for api key?! merge them
- [x] make the swipe to check animation nicer
- [x] upon submitting a list item, there is a slight wobble in y value of something. It annoys me
- [x] the settings menu should have a 'clear all data' button
- [ ] We should have a view of all items, so we can delete them or correct typos
- [ ] Items have notes, categories, uunit fields. These are not need at the item level, we only need
      this info at the listItem level (for now). We need to drop these fields in the db, in anyt
      releated API route and from the item vault
- [ ] We have to account for application state where users are no longer part of any household. I
      addition to not having a household this can also be combined with registration being disabled
      (so they are also not able to create a new household). This should be handled properly in
      front end. At minimum a message should be shown explaining the current state, and something
      friendly like: "ask one of your family members to invite you to their household" (in dutch
      ofc). We shoudl then also show a button to "delete account"
- [ ] Make interval based refresh smarter -> only fetch data that is currently in view!
- [ ] Lets split ENABLE_REGISTRATION into two flags: ENABLE_HOUSEHOLD_CREATION
      ENABLE_PUBLIC_REGISTRATION

ENABLE_HOUSEHOLD_CREATION will allow users that already have an account, to create an new household.
This can be their first household, or additional households. Please implement this feature in the
front end as well (as part of the household select input, add "+ nieuw huishouden maken")

Not sure if the backend logic is present yet for this feature (i.e. POST to households, all create
rows for the default data required for the app)

ENABLE_PUBLIC_REGISTRATION allows people to create accounts and their first households (i.e. account
registration without invitation)
