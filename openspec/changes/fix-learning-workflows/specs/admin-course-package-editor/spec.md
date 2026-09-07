# admin-course-package-editor

## MODIFIED Requirements

### Requirement: Package challenge scope is editable
The admin client SHALL allow an authorized course manager to select included and free challenges for each package entitlement.

#### Scenario: Manager configures Premium and Master differently
- **WHEN** the manager saves different challenge selections in each package
- **THEN** each package request contains its own `selectedExerciseIds` and `freeExerciseIds`.
