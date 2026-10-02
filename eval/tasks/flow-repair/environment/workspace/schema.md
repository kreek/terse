# Schema compatibility

A schema is the contract between a producer and its consumers. Producers and consumers are often run by different teams and deploy on their own schedules. A topic also holds events written under older schema versions. When a consumer can't read a new version, it gets stuck on the first event written with that version. It stays stuck unless its code skips events it can't read. Schema Registry prevents most of these failures: it checks each new version against a compatibility type and rejects a version that breaks it.

BACKWARD compatibility lets consumers using the new schema read data written with the old one. Upgrade consumers first. FORWARD is the reverse. Consumers on the old schema can read data written with the new one. FULL means both. Adding a field with no default breaks BACKWARD. BACKWARD is the default.
