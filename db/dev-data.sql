/* Script to populate the db with dummy data to test the app */

insert into config.meta(key, value) values ('dummy-data', 'true');

insert into config.device (device_id, device_name) values ('d1', 'Test device 1');
insert into config.device (device_id, device_name) values ('d2', 'Test device 2');

insert into config.sensor (device, sensor_id, sensor_name) values (1, 'd1s1', 'Test sensor 1');
insert into config.sensor (device, sensor_id, sensor_name) values (1, 'd1s2', 'Test sensor 2');
insert into config.sensor (device, sensor_id, sensor_name) values (1, 'd1s3', 'Test sensor 3');
insert into config.sensor (device, sensor_id, sensor_name) values (2, 'd2s1', 'Sensor 4');
insert into config.sensor (device, sensor_id, sensor_name) values (2, 'd2s2', 'Yet Another Sensor');

insert into auth.device_token (device, token) values (1, 'abcbcdcde');
insert into auth.device_token (device, token) values (1, 'abcdefg');
insert into auth.device_token (device, token) values (2, 'tokenSecret');

insert into auth.device_access (login_id, device) values (1, 1);
insert into auth.device_access (login_id, device) values (1, 2);
insert into auth.device_access (login_id, device) values (2, 1);
insert into auth.device_access (login_id, device) values (3, 2);

insert into auth.user_device_permission (user_id, device, admin) values (1, 1, true);
insert into auth.user_device_permission (user_id, device) values (1, 2);

insert into auth.sensor_blacklist (user_id, device, sensor) values (1, 2, 4);
