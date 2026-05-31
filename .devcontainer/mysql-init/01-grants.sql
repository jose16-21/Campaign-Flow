-- Prisma migrate dev necesita crear la base de datos shadow
-- El usuario campaign debe tener permisos de creación de bases de datos
GRANT ALL PRIVILEGES ON *.* TO 'campaign'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
