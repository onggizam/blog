# Handling Time-Series Resource Usage Data – Building an ETL Pipeline

_by Seunggi Hong_

## Introduction

In large-scale IT environments, it’s essential to regularly collect resource usage from servers and PCs.
Metrics like CPU, GPU, and MEMORY go beyond simple monitoring—they become **the foundation for long-term pattern analysis and operational efficiency**.

But when thousands of endpoints (Windows, Windows Server, Linux Server) send data every 5 minutes, simple collection quickly hits its limits.
To address this, I designed an **Apache Airflow–based ETL pipeline**, creating a stable system for ingestion, cleansing, and utilization.

## The Limits of Simple Collection

At first, I considered simply storing periodically collected data as files. But several problems became obvious:

1. **Data Explosion**

   - Thousands of endpoints × 5-minute intervals → 12 per hour, 288 per day → tens of GB daily.
   - Managing purely file-based storage became infeasible.

2. **Unsearchable**

   - With files alone, even simple queries like “CPU usage trend for a specific endpoint” took minutes to hours.
   - Real-time dashboards or operational KPIs were practically impossible.

3. **Uncertain Data Quality**

   - Missing fields, nulls, and invalid ranges (e.g., CPU > 100%) reduced trust.
   - Raw ingestion alone couldn’t ensure validation or cleansing.

4. **OS Inconsistency**

   - Fields and units varied across Windows, Windows Server, and Linux Server.
   - Without a unified schema, cross-comparison and aggregation were impossible.

5. **Analytical Constraints**

   - Long-term trend analysis and ML required time-series consistency.
   - File accumulation couldn’t guarantee this.

With these limitations, it became clear we needed **an ETL pipeline**, not just raw log collection.

## Ingestion: Safely Capturing Raw Data

Data from each endpoint was received via an **HTTP Listener** and stored in a **Landing zone** as CSVs.
The focus here was **integrity and reprocessability of raw data**.

- **Landing structure**: Files saved every 5 minutes, organized by date/time directories.
- **Immutable principle**: Raw data preserved untouched.
- **OS diversity handling**: Field differences across Windows/Windows Server/Linux Server deferred to later integration.

## Processing: Hourly ETL with Airflow

Although data arrived every 5 minutes, **ETL ran hourly batches** with Airflow DAGs. After validation and cleansing, data was loaded into a database.

- **Validation**: Missing fields, out-of-range values (e.g., CPU > 100%), anomaly detection.
- **Cleansing**: Unified OS fields, clipped CPU/GPU usage, enforced unit consistency.
- **Aggregation**: Per-endpoint averages, maxima, and sums.
- **Loading**: Refined data stored in the analytics database.

## Storage: Large-Scale Database for Analysis

Cleansed data was loaded into a **parallel-processing database** for exploration and analysis.

- **Table design**: Partitioned by date/time → optimized time-series queries.
- **SQL-based access**: Fast responses even on large volumes with parallelism.
- **OS distinction column**: Schema supported OS-based comparison/aggregation.

This allowed ops teams to quickly fetch the last hour’s data and build dashboards, while analysts could run SQL over months of history.

## Lessons Learned

1. **Raw preservation is insurance**
   Time-series rules and metrics evolve. Keeping raw data meant we could always reprocess.

2. **Noise handling defines data quality**
   CPU/GPU/MEMORY metrics are noisy. Percentile-based aggregation offered more stable insights than simple averages.

3. **Balance batch and real-time**
   Not everything must be real-time. Hourly batches prioritized stability, while the design left room for streaming expansion.

4. **OS diversity must be addressed**
   Data from Windows, Windows Server, and Linux Server differed greatly. Creating a **common schema** was a prerequisite for big data analytics.

## Conclusion

Time-series metrics like CPU, GPU, and MEMORY don’t gain value just by collecting more.
**Simple ingestion alone leads to explosion, quality issues, unsearchability, and OS mismatches.**

By introducing an Airflow ETL pipeline and database-backed storage, the data finally became a **reliable asset**, usable for both analytics and operations.

> **Lesson**: Time-series data only becomes operationally and analytically useful after cleansing, validation, and standardization—not just raw collection.

The next step is to build on this foundation with smarter analytics and automated operations to evolve the system further.
