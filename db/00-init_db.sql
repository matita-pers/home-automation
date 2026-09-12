/*
---------- start tables & schemas definitions ----------
*/

/* config schema */
create schema if not exists config;
comment on schema config is 'applications configurations & metadata is stored here + mappings';
create table if not exists config.meta (
    key        varchar(63)               not null primary key,
    value      text                      not null,
    updated_at timestamptz default now(),
    created_at timestamptz default now() not null
);

comment on table config.meta is 'table to store metadata & single configs of the app';
comment on column config.meta.key is 'the metadata name (eg: version)';
comment on column config.meta.value is 'the value associated with the key';
comment on column config.meta.updated_at is 'last updated time';
comment on column config.meta.created_at is 'created time';

create table if not exists config.device (
    id          serial        not null primary key,
    device_id   varchar(63)   not null,
    device_name text,
    constraint device_unique unique (device_id)
);

comment on table config.device is 'table to map device -> db id & give a human name/description';
comment on column config.device.id is 'database id to allow changes to device_id while preserving history';
comment on column config.device.device_id is 'machine id of the device';
comment on column config.device.device_name is 'human-readable device name';

create table if not exists config.sensor (
    id          serial                primary key,
    device      integer     not null,
    sensor_id   varchar(63) not null,
    sensor_name text,
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
comment on schema auth is 'data for authorization is stored here (tokens/passwords)';

create table if not exists auth.user (
    id            serial       not null primary key,
    username      varchar(255) not null,
    password_hash varchar(255) not null,
    salt          varchar(63)  not null default '',
    algorithm     varchar(63)  not null default 'plaintext',
    admin         boolean default false,
    unique (username)
);

comment on table auth.user is 'login credentials for users logging into frontend';
comment on column auth.user.id is 'internal id & pk';
comment on column auth.user.username is 'login username';
comment on column auth.user.password_hash is 'hashed user password';
comment on column auth.user.salt is 'salt used to hash the password';
comment on column auth.user.algorithm is 'algorithm used to hash the password';
comment on column auth.user.admin is 'an admin user can register other users';

create table if not exists auth.device_token (
    id     serial       primary key,
    device integer      not null,
    token  varchar(255) not null,
    constraint device_token_login_key unique (device, token),
    foreign key (device) references config.device on delete cascade
);

comment on table auth.device_token is 'tokens used by devices logging into the internal api';
comment on column auth.device_token.id is 'internal id';
comment on column auth.device_token.device is 'a device associated with this token';
comment on column auth.device_token.token is 'a token that can login this device';

/*
 basically a single device-token may upload data for multiple devices
 why? because i may want to use the esp32 to send only a couple of sensors, and other boards connected via serial
  with the esp32 acting as a proxy that also translates (modifies the measured time and adds the sent_at one)
  from serial to http (with the custom format).
 this is so that the esp32 id may be replaced (for ex. for a sensor revamp) and the data will keep the same id
 note that the device used to login is not implicitly included
*/
create table if not exists auth.device_access (
    id serial primary key,
    login_id integer not null,
    device integer not null,
    foreign key (login_id) references auth.device_token on delete cascade,
    foreign key (device) references config.device on delete cascade,
    unique (login_id, device)
);

comment on table auth.device_access is 'devices a device can use';
comment on column auth.device_access.id is 'internal id';
comment on column auth.device_access.login_id is 'The device login entry';
comment on column auth.device_access.device is 'a device that can upload data for';

create table if not exists auth.user_device_permission (
    id               serial primary key,
    user_id          integer                   not null,
    device           integer                   not null,
    admin            boolean     default false not null,
    timestamp        timestamptz default now() not null,
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

create table if not exists auth.sensor_blacklist (
    user_id integer not null,
    device  integer not null,
    sensor  integer not null,
    foreign key (user_id) references auth.user     on delete cascade,
    foreign key (device)  references config.device on delete cascade,
    foreign key (sensor)  references config.sensor on delete cascade,
    primary key (user_id, sensor) /* this must be unique, and there is no point in having an index */
);

comment on table auth.sensor_blacklist is 'Stores a blacklist of sensors form a device a user can''t access';
comment on column auth.sensor_blacklist.user_id is 'Foreign key referencing the user this entry belongs to';
comment on column auth.sensor_blacklist.device is 'Foreign key referencing the device for fast access';
comment on column auth.sensor_blacklist.sensor is 'Sensor the user is not allowed to access';

create index /*auth.*/sensor_blacklist_device_idx on auth.sensor_blacklist (user_id, device);
comment on index auth.sensor_blacklist_device_idx is 'Index to find all sensors blacklisted for a user on a device';

/* data schema */
create schema if not exists data;
comment on schema data is 'schema for data storage from devices';

create table if not exists data.sensor (
    id           bigserial primary key,
    timestamp    timestamptz default now() not null,
    device       integer                   not null,
    sensor       integer                   not null,
    metric_key   varchar(63)               not null,
    metric_value double precision,
    measured_at  bigint                    not null,
    sent_at      bigint    default -1,
    unique (device, sensor, metric_key, measured_at, timestamp),
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

create index if not exists /*data.*/sensor_lookup_idx on data.sensor (device, sensor, metric_key, timestamp);
comment on index data.sensor_lookup_idx is 'Index to efficiently lookup data from a sensor';

create table if not exists data.aggregated (
    device     integer           not null,
    sensor     integer           not null,
    metric_key varchar(63)       not null,
    metric_min double precision,
    metric_avg double precision,
    metric_max double precision,
    start_time timestamptz       not null,
    end_time   timestamptz       not null,
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

/*
---------- end tables definitions ----------
---------- start views definitions ----------
*/

create or replace view auth.user_sensors as
    select
        up.user_id,
        up.device,
        up.admin,
        s.id as sensor_id,
        s.sensor_id as internal_name,
        s.sensor_name
    from auth.user_device_permission up
    join config.sensor s
        on up.device = s.device
    where s.id not in (
        select sb.sensor from auth.sensor_blacklist sb
        where sb.device = up.device
        and sb.user_id = up.user_id
    )
;

comment on view auth.user_sensors is 'view to get all sensor a user has access to from a device id';

create or replace view auth.device_login as
    select dli.device_id,
           dt.token,
           dt.device,
           da.device as auth_device,
           dai.device_id as auth_device_id
    from auth.device_token dt
    join auth.device_access da
        on dt.id = da.login_id
    join config.device dli /* login device info */
        on dt.device = dli.id
    join config.device dai /* authorized device info */
        on da.device = dai.id
;

comment on view auth.device_login is 'view to get all devices a device can use to upload data';

/*
---------- end views definitions ----------
---------- start procedures definitions ----------
*/

create function config.update_meta_trg_f()
returns trigger as $$
    begin
        NEW.updated_at = now();
        return NEW;
    end;
$$ language plpgsql;

/*
---------- end procedures definitions ----------
---------- start triggers definitions ----------
*/
/*
    NOTE FOR MYSELF: triggers inherit the schema from the table
    see https://www.postgresql.org/docs/current/sql-createtrigger.html
*/

create or replace trigger /*config.*/update_meta_trg
    before insert or update
    on config.meta
    for each row
    execute function config.update_meta_trg_f();

/*
---------- end triggers definitions ----------
*/

insert into config.meta (key, value)
values ('db.script-version', '01')
-- ignore if already exists (as it may be higher)
on conflict (key) do nothing;
