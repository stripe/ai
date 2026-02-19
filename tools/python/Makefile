VENV_NAME?=.venv
UV?=uv
PYTHON?=python3.11
DEFAULT_TEST_ENV?=py311

venv: $(VENV_NAME)/bin/python

$(VENV_NAME)/bin/python: requirements.txt
	$(UV) venv --python $(PYTHON) $(VENV_NAME) --clear
	$(UV) pip install --python $(VENV_NAME)/bin/python -r requirements.txt

test: venv
	${VENV_NAME}/bin/python -m unittest discover tests

build: venv
	cp ../../LICENSE LICENSE
	${VENV_NAME}/bin/python -m build
	rm LICENSE
