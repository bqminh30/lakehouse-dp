"""
Master Pipeline Runner: Executes ETL, ClickHouse Export, and E2E Tests.
"""

import subprocess
import sys

def run_step(step_name, command):
    print("\n" + "#"*80)
    print(f"▶️ EXECUTING STEP: {step_name}")
    print("#"*80)
    res = subprocess.run(command, shell=True)
    if res.returncode != 0:
        print(f"❌ Step '{step_name}' failed with exit code {res.returncode}")
        sys.exit(res.returncode)
    print(f"✅ Step '{step_name}' completed successfully.")

def main():
    print("🚀 Starting End-to-End Lakehouse Pipeline Execution...")
    
    # Step 1: Postgres -> Iceberg (Bronze -> Silver -> Gold)
    run_step(
        "1. Postgres to Iceberg ETL (Spark)",
        "/opt/spark/bin/spark-submit /opt/spark/pipeline/etl_postgres_to_iceberg.py"
    )

    # Step 2: Iceberg Gold -> ClickHouse OLAP
    run_step(
        "2. Iceberg Gold to ClickHouse Export",
        "/opt/spark/bin/spark-submit /opt/spark/pipeline/export_iceberg_to_clickhouse.py"
    )

    # Step 3: Run comprehensive End-to-End Test Suite
    run_step(
        "3. Lakehouse Verification & Test Suite",
        "/opt/spark/bin/spark-submit /opt/spark/pipeline/test_end_to_end.py"
    )

    print("\n" + "="*80)
    print("🏆 ALL LAKEHOUSE PIPELINE STAGES FINISHED WITH 100% SUCCESS!")
    print("="*80)

if __name__ == "__main__":
    main()

