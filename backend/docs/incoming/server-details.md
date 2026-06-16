Start Up in Terminal:
bash
cd ~/Projects/CallMaster
docker-compose up -d
docker-compose logs

pip install -r requirements.txt

Shut Down:
docker-compose down

Rebuild:
docker-compose up --build
docker-compose build --no-cache backend

Activate venv:
source venv/bin/activate

https://github.com/Bestalexmartin/callmaster.git

git add .
git commit -m "my comments here"
git push

Alembic Migration Steps:
docker-compose exec backend alembic revision --autogenerate -m "Note"
docker-compose exec backend alembic upgrade head

Backup DB:
docker exec cuebe-db pg_dump -U [username] -d cuebe_db > cuebe_backup.sql
Restore DB:
docker exec -i cuebe-db psql -U [username] -d cuebe_db < cuebe_backup.sql

Congratulations. You are now fully equipped with a professional, end-to-end development workflow. You have:

A complete, containerized stack that runs with a single command.

A version control system to track every change.

A remote repository on GitHub for backup and future collaboration.

A smooth, integrated process for managing it all right inside VS Code.

The entire foundation is laid. Now you can finally start building the house.

Back End Health Check:
http://127.0.0.1:8000/api/health

Front End Health Check:
http://localhost:5173/

Swagger API Endpoints:
http://localhost:8000/docs

Docker Elements

A PostgreSQL database running and accessible on your machine at localhost:5432. Its data is safely stored in a Docker volume, so it will be there the next time you start the containers.

Your FastAPI backend running and accessible at localhost:8000.

Your React frontend running and accessible at localhost:5173.



Render Deploy
SSH
in terminal > render ssh