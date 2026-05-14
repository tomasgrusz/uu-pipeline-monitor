import { db } from '../db';
import { users, datasets, pipelines, pipelineVersions, alertRules } from '../schema';

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
