## ADDED Requirements

### Requirement: Lesson video upload posts to the running upload service

The admin lesson-video upload SHALL POST the file to `{uploadBaseUrl}/api/v1/videos` with the signed-in
user's bearer token, then attach the returned id through
`POST /api/v1/courses/lessons/{lessonId}/video/attach-upload`. It SHALL NOT call the retired
`upload-url` / `/api/videos` / `complete-upload` sequence.

#### Scenario: Mentor uploads a video for their lesson

- **WHEN** a mentor picks a video file on a lesson they own
- **THEN** the file goes to `/api/v1/videos`, and the returned videoId is attached to the lesson, which
  then reports transcoding progress instead of a 404
