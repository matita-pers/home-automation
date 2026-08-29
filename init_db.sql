
/* config schema */
create schema if not exists config;
comment on schema config is 'applications configurations & metadata is stored here + mappings';
create table if not exists config.meta (
    key        varchar(63)             not null primary key,
    value      varchar(255)            not null,
    updated_at timestamp default now(),
    created_at timestamp default now() not null
    );

comment on table config.meta is 'table to store metadata & single configs of the app';
comment on column config.meta.key is 'the metadata name (eg: version)';
comment on column config.meta.value is 'the value associated with the key';
comment on column config.meta.updated_at is 'last updated time';
comment on column config.meta.created_at is 'created time';

create table if not exists config.device (
    id          serial        not null primary key,
    device_id   varchar(63)   not null,
    device_name varchar(255),
    constraint device_unique unique (device_id)
    );

comment on table config.device is 'table to map device -> db id & give a human name/description';
comment on column config.device.id is 'database id to allow changes to device_id while preserving history';
comment on column config.device.device_id is 'machine id of the device';
comment on column config.device.device_name is 'human-readable device name ';

create table if not exists config.sensor (
    id          serial                primary key,
    device      integer     not null,
    sensor_id   varchar(63) not null,
    sensor_name varchar(255),
    constraint sensor_unique_key unique (device, sensor_id),
    foreign key (device) references config.device on delete cascade
    );

comment on table config.sensor is 'table to map sensor -> db id & give a human name/description';
comment on column config.sensor.id is 'database sensor id';
comment on column config.sensor.device is 'the device this sensor is from';
comment on column config.sensor.sensor_id is 'the id that the device is using to identify this sensor';
comment on column config.sensor.sensor_name is 'the human-readable name of this sensor';

/* auth schema */
create schema if not exists auth;
comment on schema auth is 'data for authorization is stored here (sessions/tokens/passwords)';
create table if not exists auth.user (
    id            serial not null,
    username      varchar(255)                                           not null,
    password_hash varchar(255)                                           not null,
    admin         boolean default false,
    primary key (id),
    unique (username)
    );

comment on table auth.user is 'login credentials for users logging into frontend';
comment on column auth.user.id is 'internal id & pk';
comment on column auth.user.username is 'Login username';
comment on column auth.user.password_hash is 'hashed & salted user password + salt';
comment on column auth.user.admin is 'An admin user can register other users';

create table if not exists auth.device_token (
    id     serial       primary key,
    device integer      not null,
    token  varchar(255) not null,
    constraint device_token_login_key
    unique (device, token), foreign key (device) references config.device
    on delete cascade
    );

comment on table auth.device_token is 'tokens used by devices logging into the internal api';
comment on column auth.device_token.id is 'internal id';
comment on column auth.device_token.device is 'a device associated with this token';
comment on column auth.device_token.token is 'a token that can login this device';

create table if not exists auth.user_device_permission (
    id               serial primary key,
    user_id          integer,
    device           integer,
    admin            boolean                  default false not null,
    timestamp        timestamp with time zone default now() not null,
    sensor_blacklist text[]                   default '{}'  not null,
    unique (user_id, device),
    foreign key (user_id) references auth.user on delete cascade,
    foreign key (device) references config.device on delete cascade
    );

comment on table auth.user_device_permission is 'Stores permissions for each user and device';
comment on column auth.user_device_permission.id is 'Unique identifier for the permission';
comment on column auth.user_device_permission.user_id is 'Foreign key referencing the user';
comment on column auth.user_device_permission.device is 'Foreign key referencing the device';
comment on column auth.user_device_permission.admin is 'Whether the user has admin privileges on the device (can add other users to the device)';
comment on column auth.user_device_permission.timestamp is 'Timestamp when the permission was granted';
comment on column auth.user_device_permission.sensor_blacklist is 'List of sensors that the user is not allowed to access';

/* data schema */
create schema data;
comment on schema data is 'schema for data storage from devices';
create table if not exists data.aggregated (
    device     integer           not null,
    sensor     integer           not null,
    metric_key varchar(63)       not null,
    metric_min double precision,
    metric_avg double precision,
    metric_max double precision,
    start_time timestamp         not null,
    end_time   timestamp         not null,
    entries    integer           not null,
    primary key (device, sensor, metric_key, start_time, end_time),
    foreign key (device) references config.device on delete cascade,
    foreign key (sensor) references config.sensor on delete cascade
    );

comment on table data.aggregated is 'table to store compressed sensor data';
comment on column data.aggregated.device is 'device id';
comment on column data.aggregated.sensor is 'sensor id';
comment on column data.aggregated.metric_key is 'metric key';
comment on column data.aggregated.metric_min is 'minimum measurement';
comment on column data.aggregated.metric_avg is 'average measurement';
comment on column data.aggregated.metric_max is 'maximum measurement';
comment on column data.aggregated.start_time is 'start time of the aggregated data';
comment on column data.aggregated.end_time is 'end time of the aggregated data';
comment on column data.aggregated.entries is 'number of entries in the aggregated data';

create table if not exists data.sensor (
    timestamp    timestamp default now() not null,
    device       integer                 not null,
    sensor       integer                 not null,
    metric_key   varchar(63)             not null,
    metric_value double precision,
    measured_at  bigint                  not null,
    sent_at      bigint    default -1,
    primary key (timestamp, device, sensor, metric_key, measured_at),
    foreign key (device) references config.device on delete cascade,
    foreign key (sensor) references config.sensor on delete cascade
    );

comment on table data.sensor is 'table to store compressed sensor data';
comment on column data.sensor.timestamp is 'time at which the data was saved into the db';
comment on column data.sensor.device is 'device id';
comment on column data.sensor.sensor is 'sensor id';
comment on column data.sensor.metric_key is 'metric key';
comment on column data.sensor.metric_value is 'metric value';
comment on column data.sensor.measured_at is 'device time at which the data was measured';
comment on column data.sensor.sent_at is 'device time at which the data was sent to the server';
