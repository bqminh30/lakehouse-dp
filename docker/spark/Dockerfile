FROM apache/spark:3.5.1

USER root

# Install curl, python3-pip, and python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Install python libraries for ClickHouse & Postgres connections in pipeline
RUN pip3 install --no-cache-dir clickhouse-connect psycopg2-binary requests

# Download Iceberg Spark Runtime, Iceberg AWS bundle, Hadoop AWS, AWS SDK, and Postgres JDBC JARs
RUN curl -s -f -o /opt/spark/jars/iceberg-spark-runtime-3.5_2.12-1.5.2.jar \
    https://repo1.maven.org/maven2/org/apache/iceberg/iceberg-spark-runtime-3.5_2.12/1.5.2/iceberg-spark-runtime-3.5_2.12-1.5.2.jar && \
    curl -s -f -o /opt/spark/jars/iceberg-aws-bundle-1.5.2.jar \
    https://repo1.maven.org/maven2/org/apache/iceberg/iceberg-aws-bundle/1.5.2/iceberg-aws-bundle-1.5.2.jar && \
    curl -s -f -o /opt/spark/jars/hadoop-aws-3.3.4.jar \
    https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.4/hadoop-aws-3.3.4.jar && \
    curl -s -f -o /opt/spark/jars/aws-java-sdk-bundle-1.12.262.jar \
    https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/1.12.262/aws-java-sdk-bundle-1.12.262.jar && \
    curl -s -f -o /opt/spark/jars/postgresql-42.6.0.jar \
    https://repo1.maven.org/maven2/org/postgresql/postgresql/42.6.0/postgresql-42.6.0.jar

# Copy default Spark configuration
COPY spark-defaults.conf /opt/spark/conf/spark-defaults.conf

# Set environment
ENV SPARK_HOME=/opt/spark
ENV PATH="${SPARK_HOME}/bin:${PATH}"

USER spark
WORKDIR /opt/spark
