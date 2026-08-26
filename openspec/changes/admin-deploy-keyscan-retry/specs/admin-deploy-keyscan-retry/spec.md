# admin-deploy-keyscan-retry

## ADDED Requirements

### Requirement: Transient host-key scan failures SHALL be retried

The production deploy workflow SHALL attempt `ssh-keyscan` against the production host up to three
times, waiting five seconds between attempts, and SHALL fail the step only when every attempt has
failed to yield a host key.

#### Scenario: First attempt fails, second succeeds

- **WHEN** the first `ssh-keyscan` attempt fails because of a transient DNS or network error
- **THEN** the step waits five seconds and attempts `ssh-keyscan` again
- **AND** the second attempt succeeds
- **AND** the step exits successfully so the deploy proceeds to the rsync step

#### Scenario: All three attempts fail

- **WHEN** all three `ssh-keyscan` attempts fail to obtain a host key
- **THEN** the step emits a GitHub Actions error annotation naming the failure
- **AND** the step exits with a non-zero status so no deploy is attempted against an unverified host

### Requirement: Host-key scan diagnostics SHALL reach the workflow log

The production deploy workflow SHALL NOT discard the standard error output of `ssh-keyscan`, and
SHALL record which attempt is running.

#### Scenario: Reading why a scan failed

- **WHEN** an `ssh-keyscan` attempt writes a diagnostic to standard error
- **THEN** that diagnostic appears in the workflow log for the step
- **AND** the log identifies which of the three attempts produced it

#### Scenario: Secrets stay out of the log

- **WHEN** the step reports progress or failure
- **THEN** it does not print the production host, port, or private key values as literal text

### Requirement: The step SHALL verify known_hosts actually holds a host key

The production deploy workflow SHALL confirm that `~/.ssh/known_hosts` contains at least one
non-blank line after the scan loop, and SHALL treat an empty file as a failure of the step.

#### Scenario: Scan exits zero but writes nothing

- **WHEN** `ssh-keyscan` exits with status zero but appends no host key to `~/.ssh/known_hosts`
- **THEN** the step treats the attempt as unsuccessful and retries within the three-attempt budget
- **AND** if the file is still empty after the final attempt, the step fails with an error annotation

#### Scenario: Successful scan reports what it collected

- **WHEN** the scan loop obtains at least one host key
- **THEN** the step logs how many host-key lines `~/.ssh/known_hosts` now contains

### Requirement: Each scan attempt SHALL be time-bounded

The production deploy workflow SHALL pass an explicit timeout to each `ssh-keyscan` attempt so that
a hung attempt cannot consume the job's overall time budget.

#### Scenario: An attempt hangs

- **WHEN** an `ssh-keyscan` attempt cannot reach the host and would otherwise block
- **THEN** that attempt aborts at its configured timeout
- **AND** the remaining attempts still run within the job timeout

### Requirement: The deploy path SHALL remain unchanged

This change SHALL confine itself to the SSH setup step; the workflow SHALL continue to stage
`dist/` over rsync and apply it through the root-owned wrapper.

#### Scenario: Deploy still runs through the root wrapper

- **WHEN** the SSH setup step succeeds
- **THEN** the workflow rsyncs `dist/` into the deploy user's staging directory
- **AND** invokes `sudo /usr/local/sbin/ftes-admin-deploy.sh` to publish it
- **AND** no other step, trigger, or concurrency setting of the workflow is altered
