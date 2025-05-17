# models/feed.py (or at top of app_unified.py)

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Feed(Base):
    __tablename__ = 'feeds'

    id = Column(String, primary_key=True)  # UUID or timestamp-based ID
    filename = Column(String)
    platform = Column(String)
    status = Column(String)  # 'processing', 'success', 'failed'
    upload_time = Column(DateTime, default=datetime.utcnow)
    row_count = Column(Integer)
    output_path = Column(String)
    log_path = Column(String)
    summary_json = Column(JSON)  # { success: 40, failed: 10 }

