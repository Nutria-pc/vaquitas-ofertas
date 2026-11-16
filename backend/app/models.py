from datetime import datetime, timezone
from sqlalchemy import create_engine, String, Integer, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./radar_gaming.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase): pass

class Game(Base):
    __tablename__ = "games"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    canonical_title: Mapped[str] = mapped_column(String(250), index=True)
    game_type: Mapped[str] = mapped_column(String(30), default="game")
    platforms: Mapped[str] = mapped_column(String(250), default="PC")
    release_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    msrp_crc: Mapped[float | None] = mapped_column(Float, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    aliases_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    prices: Mapped[list["PriceObservation"]] = relationship(back_populates="game")

class PriceObservation(Base):
    __tablename__ = "price_observations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    store: Mapped[str] = mapped_column(String(100), index=True)
    price_crc: Mapped[float] = mapped_column(Float)
    regular_price_crc: Mapped[float | None] = mapped_column(Float, nullable=True)
    original_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    original_currency: Mapped[str] = mapped_column(String(8), default="CRC")
    product_url: Mapped[str] = mapped_column(String(1000))
    product_format: Mapped[str] = mapped_column(String(30), default="Digital")
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    stale: Mapped[bool] = mapped_column(Boolean, default=False)
    game: Mapped[Game] = relationship(back_populates="prices")

class ExternalFact(Base):
    __tablename__ = "external_facts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    source: Mapped[str] = mapped_column(String(50))
    fact_type: Mapped[str] = mapped_column(String(50))
    value: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
