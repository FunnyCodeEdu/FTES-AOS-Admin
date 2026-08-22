# academic-course-console (delta)

## MODIFIED Requirements

### Requirement: Pricing tab shows current price

The course pricing tab SHALL prefill the base price field from the course's current price (adminCourse
totalPrice), so an admin sees and can edit the real price instead of an empty field.

#### Scenario: Open pricing of a priced course

- **WHEN** an admin opens the Giá & gói tab of a course that has a price
- **THEN** the "Giá gốc" field shows the current price and the warning banner is gone
