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
- [x] We should have a view of all items, so we can delete them or correct typos
- [x] Items have notes and categories fields. These are not need at the item level, we only need
      this info at the listItem level (for now). We need to drop these fields in the db, in anyt
      releated API route and from the item vault
- [x] When a unit is assigned (eg "stuks") to a list item, that value needs to be set for the
      related items as well - so it will act as the default unit for all items of that type
- [x] After avatar upload, the page needs a refresh for the avatar to display. That should be
      immediately updated in UI...
- [x] Settings components and pages have repetetive UI elements (navigation, pageshell, cards). We
      can organize this better with a settings layout, and maybe a settings shell?
- [x] If an avatar is uploaded, the profile forms clears as well (we dont want this. Avatar should
      be fully seperated from the profile form)
- [x] Lets split ENABLE_REGISTRATION into two flags: ENABLE_HOUSEHOLD_CREATION
      ENABLE_PUBLIC_REGISTRATION

      ENABLE_HOUSEHOLD_CREATION will allow users that already have an account, to create an new household.
      This can be their first household, or additional households. Please implement this feature in the
      front end as well (as part of the household select input, add "+ nieuw huishouden maken")

      Not sure if the backend logic is present yet for this feature (i.e. POST to households, all create
      rows for the default data required for the app)

      ENABLE_PUBLIC_REGISTRATION allows people to create accounts and their first households (i.e. account
      registration without invitation). Dont implement this in the app logic just yet

- [x] We have to account for application state where users are no longer part of any household. I
      addition to not having a household this can also be combined with registration being disabled
      (so they are also not able to create a new household). This should be handled properly in
      front end, preferably globally (so we dont have to account for this exception in EVERY view).
      At minimum a message should be shown explaining the current state, and something friendly
      like: "ask one of your family members to invite you to their household" (in dutch ofc). We
      shoudl then also show a button to "delete account" - or create a new household (if
      ENABLE_HOUSEHOLD_CREATION is true)
- [x] in the leaveHousehold flow, we need a front end check for household owner, and prompt to
      assign a new owner if none are left. Currently, there is no UI or logic fro that front end
- [x] Item delete from item vault is not possible if there are still references to this item from
      list items. That is bad UX, becasue that is always the case. So much better would be: when an
      item is deleted, delete associated list items. If any of these list items have an 'checked' or
      'unchecked' status, add a ui confirmation prompt: "Dit item wordt nog gebruikt in één van je
      lijstjes. Weet je zeker dat je het wilt verwijderen?". If status is archived, just delete is
      without prompt
- [x] If multi tenancy is disbaled, it should not be possible to delete the household, or to delete
      the LAST household owner or to delete the LAST household owner account
- [x] If multi tenancy is enabled AND public registration, we do not need to seed initial admin user
      and house hold
- [x] List items are not refresh by interval.. Only lists
- [x] Make interval based refresh smarter -> only fetch data that is currently in view!
- [x] Cannot delete user account (from orphaned state) due to FK contstraints. Users that are still
      part of a household can be deleted just fine!
- [x] we have a users.delete endpoint and a profile.delete endpoint (the latter does al sorts of
      checks). Shouldnt these be merged?
- [x] If the last household member tries to leave a household, treat that case as on household
      delete (explain this to the user in the confirmation dialog)
- [x] settings navigation is not sticky
