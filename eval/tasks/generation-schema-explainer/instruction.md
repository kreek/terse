Write a short explainer for backend engineers new to Kafka on why Schema Registry compatibility checks matter. Save it as `schema-registry.md`. Write it as prose paragraphs, with no bullet lists.

Cover these points:

- A schema is the contract between a producer and its consumers.
- Producers and consumers are often owned by different teams and deploy on their own schedules.
- A topic keeps events written under older schema versions.
- A consumer that cannot read a new schema version stops at the first event written with it, and stays stopped unless its code skips events it cannot read.
- Schema Registry checks each new schema version against the subject's compatibility type, BACKWARD by default, and rejects a version that breaks it.
