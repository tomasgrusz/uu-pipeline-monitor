import { fileURLToPath } from 'url';
import { db } from '../db';
import { pipelines } from '../schema';
import { publishPipelineRun } from '../services/rabbitmq';
import { connectRabbitMQ, disconnectRabbitMQ } from '../services/rabbitmq';
import { getLatestPipelineVersion } from '../services/helpers';

/**
 * Trigger all pipelines to create sample job runs
 * Run with: npx tsx src/seeds/runPipelines.ts
 */
export async function runAllPipelines() {
  console.log('🚀 Triggering all pipelines...\n');

  try {
    // Connect to RabbitMQ
    console.log('📡 Connecting to RabbitMQ...');
    await connectRabbitMQ();
    console.log('✓ Connected\n');

    // Get all active pipelines
    console.log('📋 Fetching pipelines...');
    const allPipelines = await db.select().from(pipelines);
    const activePipelines = allPipelines.filter((p) => p.active);

    if (activePipelines.length === 0) {
      console.log('⚠️  No active pipelines found. Run npm run db:seed first.\n');
      return { triggered: 0 };
    }

    console.log(`✓ Found ${activePipelines.length} active pipelines\n`);

    // Trigger each pipeline
    console.log('🔄 Triggering pipelines...');
    let triggeredCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const pipeline of activePipelines) {
      try {
        console.log(`   ⏳ ${pipeline.name}...`);
        const version = await getLatestPipelineVersion(pipeline.id);
        await publishPipelineRun(pipeline.id, version);
        console.log(`   ✓ Queued`);
        successCount++;
        triggeredCount++;
      } catch (error) {
        console.log(`   ❌ Failed: ${error}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Pipeline execution complete!\n`);
    console.log('📈 Summary:');
    console.log(`   • Pipelines triggered: ${successCount}`);
    console.log(`   • Failed: ${errorCount}`);
    console.log(`   • Total: ${triggeredCount}\n`);

    console.log('📊 Next steps:');
    console.log('   • Monitor job runs: curl http://localhost:3000/runs');
    console.log('   • View specific run: curl http://localhost:3000/runs/{runId}');
    console.log('   • Check Swagger UI: http://localhost:3000/docs\n');

    // Disconnect RabbitMQ
    await disconnectRabbitMQ();

    return { triggered: successCount, failed: errorCount };
  } catch (error) {
    console.error('❌ Error triggering pipelines:', error);
    await disconnectRabbitMQ();
    throw error;
  }
}

// Run the function if this file is executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  runAllPipelines()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default runAllPipelines;
