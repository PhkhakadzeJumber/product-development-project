import configparser
import logging
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.db.base import Base
from app.models import catalog, chat, clinical, feedback, scheduling, subtypes, user_account  # noqa
from app.core.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
if config.config_file_name:
    _parser = configparser.ConfigParser()
    _parser.read(config.config_file_name)
    if _parser.has_section("formatters"):
        fileConfig(config.config_file_name)
    else:
        logging.basicConfig(level=logging.INFO)
target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online() if not context.is_offline_mode() else run_migrations_offline()
