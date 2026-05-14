# Important Implementation Details

## Limitations & Future Improvements

1. **Condition Evaluation** - Currently uses `Function()` constructor which is unsafe
   - ⚠️ **Production Note**: Use a proper expression parser like `expr-eval` library
   - Current approach works for simple comparisons but should be replaced

2. **Cron Scheduling** - Placeholder implementation only
   - ⚠️ **Production Note**: Needs cron parser library (e.g., `cron-parser`)
   - Currently logs scheduled pipelines but doesn't execute them
   - To implement: use `node-cron` or `bull` job queue

3. **Scheduler Type**
   - Current: In-memory scheduler in main process
   - ⚠️ **Production Note**: For multi-instance deployments, use:
     - Bull Redis queue
     - Apache Airflow
     - Temporal
     - Kubernetes CronJob

4. **Error Handling** - Minimal error recovery
   - Failed runs stay in `pending`/`running` state
   - No automatic retry logic
   - ⚠️ **Future**: Add retry logic, timeout handling, and error notifications

5. **Result Capture** - No mechanism to store pipeline execution results
   - Job runs only track status and record count
   - ⚠️ **Future**: Add result storage (S3, database, etc.)

6. **Job Run Steps**
   - Steps are created manually via API
   - ⚠️ **Future**: Auto-create steps during pipeline execution
   - Auto-update step status during execution

## Future Enhancements

1. **Expression Parser** - Replace unsafe `Function()` with `expr-eval`
2. **Cron Scheduling** - Implement proper cron parsing and execution
3. **Result Storage** - Store pipeline outputs/logs
4. **Notifications** - Send alerts via email, Slack, PagerDuty
5. **Metrics** - Collect and export execution metrics
6. **Retry Logic** - Automatic retry for failed runs
7. **Distributed Scheduler** - Support multi-instance deployments
8. **DAG Support** - Allow complex pipeline dependencies
