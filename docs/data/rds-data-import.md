# RDS Data Import

There are numerous approaches to load data into RDS databases.

AWS documents a few options here:

- <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.html>

## Direct Connection

The following can load data stored on a filesystem (e.g. of a local workstation or EC2 instance on AWS). The data source can also potentially be S3 (e.g. via s3fs-fuse).

Connect to the postgres database:

```sh
psql --host=db-instance.111122223333.aws-region.rds.amazonaws.com --port=5432 --username=postgres --password --dbname=target-db
```

Use the `\copy` command to upload data from a complete path on the connecting machine's filesystem.

No headers:

```pgsql
\copy target_table from '/complete/path/to/local/filename.csv' WITH DELIMITER ',' CSV;
```

Column headers:

```pgsql
\copy target_table (column-1, column-2, column-3, ...) 
  from '/path/to/local/filename.csv' WITH DELIMITER ',' CSV HEADER;
```

These steps can be combined into a single command using the `-c` copy meta-command:

```sh
psql target-db \
  -U <admin user> \
  -p <port> \
  -h <DB instance name> \
  -c "\copy source-table from 'source-table.csv' with DELIMITER ','" 
```

## AWS S3 Extension

Ensure the desired data is saved in S3 (e.g. CSV file(s)). There are also many AWS services that can save data to S3 (including AWS Kinesis Data Streams, output from AWS Glue or Athena queries, etc).

To use the aws-cli to upload a data to s3:

```sh
aws s3 cp s3://example_s3_bucket/example_file_path ./ 
```

Login to postgres and install the S3 extension:

```postgres
CREATE EXTENSION aws_s3 CASCADE;
```

Ensure db schema (table(s)) exist.

An example of `aws_s3.table_import_from_s3` is below. Refer to the docs links for complete information.

```sql
SELECT aws_s3.table_import_from_s3(
  'destination_table_name', '', '(format csv, header true)',
  aws_commons.create_s3_uri('source_bucket_name', 'path/to/file/example.csv', 'ca-central-1')
);
```

Note: empty values can be converted to null with:

```sql
-- (format csv, FORCE_NULL (columnname), header true)
```

Docs:

- <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.html>
- <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.S3Import.html>
