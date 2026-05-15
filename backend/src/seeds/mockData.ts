import { db } from '../db';
import { users, datasets, pipelines, pipelineVersions, alertRules, jobRuns, jobRunSteps, alertEvents } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Seed the database with mock data
 * Run with: npx tsx src/seeds/mockData.ts
 */
export async function seedDatabase() {
  console.log('🌱 Seeding database with mock data...\n');

  try {
    // Clear existing data (optional - comment out to append)
    await db.delete(alertRules);
    await db.delete(pipelineVersions);
    await db.delete(pipelines);
    await db.delete(datasets);
    await db.delete(users);

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await db
      .insert(users)
      .values([
        {
          email: 'admin@example.com',
          role: 'admin',
        },
        {
          email: 'operator@example.com',
          role: 'operator',
        },
        {
          email: 'viewer@example.com',
          role: 'viewer',
        },
      ])
      .returning();
    console.log(`   ✓ Created ${createdUsers.length} users\n`);

    // Create datasets
    console.log('📊 Creating datasets...');
    const createdDatasets = await db
      .insert(datasets)
      .values([
        {
          name: 'customer-transactions',
          description: 'Raw transaction dataset from online store',
          owner: 'data-team',
          schemaVersion: 1,
        },
        {
          name: 'product-inventory',
          description: 'Real-time product inventory levels',
          owner: 'inventory-team',
          schemaVersion: 2,
        },
        {
          name: 'user-analytics',
          description: 'User behavior and engagement metrics',
          owner: 'analytics-team',
          schemaVersion: 3,
        },
      ])
      .returning();
    console.log(`   ✓ Created ${createdDatasets.length} datasets\n`);

    // Create pipelines and versions
    console.log('🔄 Creating pipelines and versions...');
    let pipelineCount = 0;
    let versionCount = 0;

    for (const dataset of createdDatasets) {
      const pipelineConfigs = [
        {
          name: `${dataset.name}-frequent-sync`,
          description: `Frequent data sync for ${dataset.name} (every 5 minutes)`,
          schedule: '*/5 * * * *', // Every 5 minutes (for testing)
        },
        {
          name: `${dataset.name}-hourly-sync`,
          description: `Hourly sync for ${dataset.name}`,
          schedule: '0 * * * *', // Every hour
        },
        {
          name: `${dataset.name}-validation`,
          description: `Data quality validation for ${dataset.name}`,
          schedule: '30 1 * * *', // 1:30 AM daily
        },
      ];

      for (const pipelineConfig of pipelineConfigs) {
        const createdPipeline = await db
          .insert(pipelines)
          .values({
            datasetId: dataset.id,
            name: pipelineConfig.name,
            description: pipelineConfig.description,
            schedule: pipelineConfig.schedule,
            active: true,
          })
          .returning();

        const pipeline = createdPipeline[0];
        pipelineCount++;

        // Create two versions for each pipeline
        const versionConfigs = [
          {
            version: 1,
            config: {
              engine: 'spark',
              mode: 'batch',
              query: `SELECT * FROM ${dataset.name} WHERE date >= CURRENT_DATE - INTERVAL '7 days'`,
              timeout: 3600,
            },
          },
          {
            version: 2,
            config: {
              engine: 'spark',
              mode: 'batch',
              query: `SELECT * FROM ${dataset.name} WHERE date >= CURRENT_DATE - INTERVAL '30 days'`,
              timeout: 7200,
              optimization: 'partitioned',
            },
          },
        ];

        for (const versionConfig of versionConfigs) {
          await db
            .insert(pipelineVersions)
            .values({
              pipelineId: pipeline.id,
              version: versionConfig.version,
              config: versionConfig.config,
            })
            .returning();

          versionCount++;
        }

        console.log(`   ✓ Pipeline: ${pipelineConfig.name} (v1, v2)`);
      }
    }

    console.log(`   Total: ${pipelineCount} pipelines, ${versionCount} versions\n`);

    // Create alert rules
    console.log('🔔 Creating alert rules...');
    let alertCount = 0;

    for (const pipeline of await db.select().from(pipelines)) {
      const alertConfigs = [
        {
          name: 'Long Runtime Alert',
          condition: 'runtime > 30',
          description: 'Alert if pipeline takes more than 30 minutes',
        },
        {
          name: 'Failed Pipeline Alert',
          condition: "status == 'failed'",
          description: 'Alert when pipeline fails',
        },
        {
          name: 'Low Records Alert',
          condition: 'recordsProcessed < 1000',
          description: 'Alert if fewer than 1000 records processed',
        },
      ];

      // Only create alerts for first and second pipeline (not all)
      if (alertCount < 6) {
        for (const alertConfig of alertConfigs.slice(0, 2)) {
          await db
            .insert(alertRules)
            .values({
              pipelineId: pipeline.id,
              name: alertConfig.name,
              condition: alertConfig.condition,
              enabled: true,
            })
            .returning();

          alertCount++;
        }
      }
    }

    console.log(`   ✓ Created ${alertCount} alert rules\n`);

    // Create job runs and steps for each pipeline
    console.log('🏃 Creating job runs and steps...');
    let totalRuns = 0;

    const allPipelines = await db.select().from(pipelines);
    for (const pipeline of allPipelines) {
      // Get latest pipeline version (fallback to 1)
      const versions = await db.select().from(pipelineVersions).where(eq(pipelineVersions.pipelineId, pipeline.id)).orderBy(desc(pipelineVersions.version)).limit(1);
      const version = versions[0]?.version ?? 1;

      // Create 5 successful runs with steps
      for (let i = 0; i < 5; i++) {
        const started = new Date(Date.now() - (i + 1) * 60000);
        const finished = new Date(started.getTime() + (30000 + Math.floor(Math.random() * 30000)));
        const records = Math.floor(1000 + Math.random() * 9000);

        const inserted = await db
          .insert(jobRuns)
          .values({
            pipelineId: pipeline.id,
            pipelineVersion: version,
            status: 'success',
            startedAt: started,
            finishedAt: finished,
            recordsProcessed: records,
          })
          .returning();

        const run = inserted[0];

        // Create steps for the run
        const stepNames = ['extract', 'transform', 'load'];
        let stepStart = new Date(started);
        for (const stepName of stepNames) {
          const stepDuration = 5000 + Math.floor(Math.random() * 10000);
          const stepFinished = new Date(stepStart.getTime() + stepDuration);
          await db.insert(jobRunSteps).values({
            runId: run.id,
            name: stepName,
            status: 'success',
            startedAt: stepStart,
            finishedAt: stepFinished,
          });
          stepStart = new Date(stepFinished.getTime() + 1000);
        }

        totalRuns++;
      }

      // Create 2-3 failed runs with partial steps and alert events
      const failedCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
      for (let j = 0; j < failedCount; j++) {
        const started = new Date(Date.now() - (10 + j) * 60000);
        const finished = new Date(started.getTime() + (5000 + Math.floor(Math.random() * 15000)));
        const records = Math.floor(Math.random() * 500);
        const error = 'Step transform failed with exception';

        const inserted = await db
          .insert(jobRuns)
          .values({
            pipelineId: pipeline.id,
            pipelineVersion: version,
            status: 'failed',
            startedAt: started,
            finishedAt: finished,
            recordsProcessed: records,
            errorMessage: error,
          })
          .returning();

        const run = inserted[0];

        // Extract step succeeded
        const step1Finished = new Date(started.getTime() + 5000);
        await db.insert(jobRunSteps).values({
          runId: run.id,
          name: 'extract',
          status: 'success',
          startedAt: started,
          finishedAt: step1Finished,
        });

        // Transform step failed
        const step2Start = new Date(step1Finished.getTime() + 1000);
        const step2Finished = new Date(step2Start.getTime() + 3000);
        await db.insert(jobRunSteps).values({
          runId: run.id,
          name: 'transform',
          status: 'failed',
          startedAt: step2Start,
          finishedAt: step2Finished,
        });

        totalRuns++;

        // Create alert event(s) for this failed run if alert rules exist for the pipeline
        const rules = await db.select().from(alertRules).where(eq(alertRules.pipelineId, pipeline.id));
        if (rules.length > 0) {
          const rule = rules[0];
          await db.insert(alertEvents).values({
            ruleId: rule.id,
            runId: run.id,
            message: `Pipeline ${pipeline.name} failed: ${error}`,
          });
        }
      }
    }

    console.log(`   ✓ Created ${totalRuns} job runs (including failed runs)\n`);

    console.log('✅ Database seeding completed!\n');
    console.log('📈 Summary:');
    console.log(`   • Users: ${createdUsers.length}`);
    console.log(`   • Datasets: ${createdDatasets.length}`);
    console.log(`   • Pipelines: ${pipelineCount}`);
    console.log(`   • Pipeline Versions: ${versionCount}`);
    console.log(`   • Alert Rules: ${alertCount}\n`);

    return {
      users: createdUsers.length,
      datasets: createdDatasets.length,
      pipelines: pipelineCount,
      versions: versionCount,
      alerts: alertCount,
    };
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

import { fileURLToPath } from 'url';

// Run the seed function if this file is executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
