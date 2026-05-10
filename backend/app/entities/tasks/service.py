from sqlalchemy import select
from sqlalchemy.orm import Session

from app.entities.tasks.models import Task, TaskSubmission


def list_tasks(db: Session) -> list[Task]:
    query = select(Task).order_by(Task.created_at.desc())
    return list(db.scalars(query).all())


def get_task(db: Session, task_id: int) -> Task | None:
    return db.get(Task, task_id)


def check_answer(task: Task, answer: str) -> bool:
    cleaned_answer = answer.strip().lower()
    if not cleaned_answer:
        return False

    if task.solution_text:
        return cleaned_answer == task.solution_text.strip().lower()

    if task.solution_keywords:
        keywords = [word.strip().lower() for word in task.solution_keywords.split(",") if word.strip()]
        return all(keyword in cleaned_answer for keyword in keywords)

    return False


def submit_answer(db: Session, task: Task, user_id: int, answer: str) -> TaskSubmission:
    is_correct = check_answer(task, answer)
    submission = TaskSubmission(task_id=task.id, user_id=user_id, answer=answer, is_correct=is_correct)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def get_user_submissions_for_task(db: Session, task_id: int, user_id: int) -> list[TaskSubmission]:
    query = (
        select(TaskSubmission)
        .where(TaskSubmission.task_id == task_id, TaskSubmission.user_id == user_id)
        .order_by(TaskSubmission.created_at.desc())
    )
    return list(db.scalars(query).all())
