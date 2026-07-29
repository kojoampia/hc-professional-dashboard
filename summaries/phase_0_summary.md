# Phase 0 Summary - Approved Product Decisions

## Scope

Completed task 0 from `plan.md`: recorded the product and technical decisions required before feature implementation.

## Approved decisions

| Area                   | Decision                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI platform            | Upgrade to Angular 19, Angular Material 19, and Tailwind CSS v4.                                                                                                          |
| Authorization          | Admin and Doctor may perform all mutations. Nurse, Paramedic, Therapist, and Pharmacist may modify clinical cases, activities, and reports. Carer and User are read-only. |
| Patient detail         | Use the deep-linkable, route-driven 2x3 overlay from `spec.md`; do not implement the conflicting tabbed profile.                                                          |
| Contact terminology    | Replace “Angel” with “Emergency contact / next of kin.”                                                                                                                   |
| Visitation terminology | Human-health domain; replace “Grooming” with “Personal care visit.”                                                                                                       |
| Copy action            | Create a new draft duplicate only after confirmation.                                                                                                                     |
| Closed-case menu       | Offer View, Reopen, and Archive.                                                                                                                                          |
| Documents              | Use a separate clinical-report model rather than reusing professional registration documents.                                                                             |

## Checks

- [x] D0 platform decision is recorded in `plan.md`.
- [x] D1 approved UI permission matrix is recorded in `plan.md`.
- [x] D2 selects the route-driven overlay as the canonical patient-detail interaction.
- [x] D3 resolves terminology, record-copy, closed-case, and report-model decisions.
- [x] The unresolved custom clinical authority availability remains explicitly tracked as a backend dependency.

## Next task

Task 1: inventory the current application integration points before changing the UI platform.
