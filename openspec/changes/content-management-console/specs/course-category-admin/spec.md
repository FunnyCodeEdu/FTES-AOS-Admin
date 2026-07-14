# course-category-admin

## ADDED Requirements

### Requirement: Manage course categories
The admin console SHALL provide a page to list, create, update, and delete course categories
via the `/course-categories` admin endpoints, showing each category's name, slug, and course
count.

#### Scenario: Create a category
- **WHEN** an editor with `course.category.manage` submits a new category name
- **THEN** the category is created (slug auto-generated if left blank) and appears in the list

#### Scenario: Edit a category
- **WHEN** an editor updates a category's name or description
- **THEN** the change is persisted and reflected in the list

### Requirement: Blocked delete surfaces a clear message
The admin console SHALL surface a friendly error when deleting a category that still has
courses, rather than a generic failure.

#### Scenario: Delete an in-use category
- **WHEN** an editor deletes a category the backend rejects with 409 `COURSE_CATEGORY_IN_USE`
- **THEN** a message explains the category still has courses and nothing is deleted

### Requirement: Navigation entry gated by permission
The console SHALL show a "Danh mục khoá học" menu entry under the academic group only for
users holding `course.category.manage`.

#### Scenario: Menu visibility
- **WHEN** a signed-in admin holds `course.category.manage`
- **THEN** the category menu entry is visible; otherwise it is hidden
