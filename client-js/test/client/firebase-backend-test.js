/*
 * Copyright 2018, TeamDev. All rights reserved.
 *
 * Redistribution and use in source and/or binary forms, with or without
 * modification, must retain the above copyright notice and the following
 * disclaimer.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import assert from 'assert';
import uuid from 'uuid';

import {devFirebaseApp} from './test-firebase-app';
import {TypedMessage, TypeUrl} from '../../src/client/typed-message';

import {CreateTask, RenameTask} from '../../proto/test/js/spine/web/test/given/commands_pb';
import {TaskId} from '../../proto/test/js/spine/web/test/given/task_pb';
import {Topic} from '../../proto/test/js/spine/client/subscription_pb';
import {BackendClient} from '../../src/client/backend-client';

const MILLISECONDS = 1;
const SECONDS = 1000 * MILLISECONDS;
const MINUTES = 60 * SECONDS;

function fail(done, message) {
  return error => {
    if (message) {
      done(new Error(`Test failed. Cause: ${message}`))
    } else {
      done(new Error(`Test failed. Cause: ${error ? JSON.stringify(error) : 'not identified'}`))
    }
  };
}

class Given {

  constructor() {
    this.defaultTaskName = 'Get to Mount Doom';
    this.defaultTaskDescription = 'There seems to be a bug with the rings that needs to be fixed';
    this.TYPE = {
      OF_ENTITY: {
        TASK: new TypeUrl('type.spine.io/spine.web.test.given.Task'),
        PROJECT: new TypeUrl('type.spine.io/spine.web.test.given.Project')
      },
      OF_IDENTIFIER: {
        TASK_ID: new TypeUrl('type.spine.io/spine.web.test.given.TaskId'),
      },
      OF_COMMAND: {
        CREATE_TASK: new TypeUrl('type.spine.io/spine.web.test.given.CreateTask'),
        RENAME_TASK: new TypeUrl('type.spine.io/spine.web.test.given.RenameTask'),
      },
      MALFORMED: new TypeUrl('types.spine.io/malformed')
    };
    Given._deepFreeze(this);
  }

  backendClient() {
    return BackendClient.usingFirebase({
      atEndpoint: 'https://spine-dev.appspot.com',
      withFirebaseStorage: devFirebaseApp,
      forActor: 'web-test-actor-2'
    });
  }

  createTaskCommand({withId: id, withPrefix: idPrefix, named: name, describedAs: description}) {
    const taskId = this._taskId({value: id, withPrefix: idPrefix});

    name = typeof name === 'undefined' ? this.defaultTaskName : name;
    description = typeof description === 'undefined' ? this.defaultTaskDescription : description;

    const command = new CreateTask();
    command.setId(taskId);
    command.setName(name);
    command.setDescription(description);

    return new TypedMessage(command, this.TYPE.OF_COMMAND.CREATE_TASK);
  }

  createTaskCommands({count, withPrefix: idPrefix, named: names}) {
    if (!names || names.length !== count) {
      throw new Error('Name count does not match the count of tasks to be created');
    }
    const commands = [];
    for (let i = 0; i < count; i++) {
      const command = this.createTaskCommand({
        withPrefix: idPrefix,
        named: names[i]
      });
      commands.push(command);
    }
    return commands;
  }

  renameTaskCommand({withId: id, to: newName}) {
    const taskId = this._taskId({value: id});

    const command = new RenameTask();
    command.setId(taskId);
    command.setName(newName);

    return new TypedMessage(command, this.TYPE.OF_COMMAND.RENAME_TASK);

  }

  _taskId({value, withPrefix: prefix}) {
    if (typeof value === 'undefined') {
      value = uuid.v4();
    }
    if (typeof prefix !== 'undefined') {
      value = `${prefix}-${value}`;
    }
    const taskId = new TaskId();
    taskId.setValue(value);
    return taskId;
  }

  /**
   * A function that does nothing.
   */
  noop() {
    // Do nothing.
  }

  static _deepFreeze(object) {

    const propNames = Object.getOwnPropertyNames(object);

    propNames.forEach((name) => {
      const value = object[name];

      object[name] = value && typeof value === "object" ? Given._deepFreeze(value) : value;
    });

    return Object.freeze(object);
  }
}

const given = new Given();
const backendClient = given.backendClient();

describe('Client should', function () {

  // Big timeout due to remote calls during tests.
  this.timeout(2 * MINUTES);

  it('send commands successfully', done => {

    const command = given.createTaskCommand({
      withIdPrefix: 'spine-web-test-send-command',
      named: 'Implement Spine Web JS client tests',
      describedAs: 'Spine Web need integration tests'
    });

    const taskId = command.message.getId();

    backendClient.sendCommand(command, () => {

      const typedId = new TypedMessage(taskId, given.TYPE.OF_IDENTIFIER.TASK_ID);

      backendClient.fetchById(given.TYPE.OF_ENTITY.TASK, typedId, data => {
        assert.equal(data.id.value, taskId.getValue());
        assert.equal(data.name, command.message.getName());
        assert.equal(data.description, command.message.getDescription());

        done();

      }, fail(done));

    }, fail(done), fail(done));
  });

  it('fail a malformed command', done => {
    const command = given.createTaskCommand({withId: null});

    backendClient.sendCommand(
      command,
      fail(done, 'A command was successful when it was expected to fail.'),
      error => {
        assert.equal(error.code, 2);
        assert.equal(error.type, 'spine.core.CommandValidationError');
        assert.ok(error.validationError);
        done();
      },
      fail(done, 'A command was rejected when an error was expected.'));
  });

  it('fetch all the existing entities of given type one by one', done => {
    const command = given.createTaskCommand({withPrefix: 'spine-web-test-one-by-one'});
    const taskId = command.message.getId();

    backendClient.sendCommand(command, () => {

      let itemFound = false;

      backendClient.fetchAll({ofType: given.TYPE.OF_ENTITY.TASK}).oneByOne().subscribe({
        next(data) {
          // Ordering is not guaranteed by fetch and 
          // the list of entities cannot be cleaned for tests,
          // thus at least one of entities should match the target one.
          itemFound = data.id.value === taskId.getValue() || itemFound;
        },
        error: fail(done),
        complete() {
          assert.ok(itemFound);
          done();
        }
      });

    }, fail(done), fail(done));
  });

  it('fetch all the existing entities of given type at once', done => {
    const command = given.createTaskCommand({withPrefix: 'spine-web-test-at-once'});
    const taskId = command.message.getId();

    backendClient.sendCommand(command, () => {

      backendClient.fetchAll({ofType: given.TYPE.OF_ENTITY.TASK}).atOnce()
        .then(data => {
          const targetObject = data.find(item => item.id.value === taskId.getValue());
          assert.ok(targetObject);
          done();
        }, fail(done));

    }, fail(done), fail(done));
  });

  it('fetch an empty list for entity that does not get created at once', done => {
    backendClient.fetchAll({ofType: given.TYPE.OF_ENTITY.PROJECT}).atOnce()
      .then(data => {
        assert.ok(data.length === 0);
        done();
      }, fail(done));
  });

  it('fetch an empty list for entity that does not get created one-by-one', done => {
    backendClient.fetchAll({ofType: given.TYPE.OF_ENTITY.PROJECT}).oneByOne()
      .subscribe({
        next: fail(done),
        error: fail(done),
        complete: () => done()
      });
  });

  it('fail a malformed query', done => {
    const command = given.createTaskCommand({withPrefix: 'spine-web-test-malformed-query'});

    backendClient.sendCommand(command, () => {

      backendClient.fetchAll({ofType: given.TYPE.MALFORMED}).atOnce()
        .then(fail(done), error => {
          assert.ok(!error.isClient());
          assert.ok(error.isServer());
          done();
        });

    }, fail(done), fail(done));
  });

  it('subscribe to new entities of type', done => {
    const TASKS_TO_BE_CREATED = 3;
    let taskIds;
    let count = 0;
    backendClient.subscribeToEntities({ofType: given.TYPE.OF_ENTITY.TASK})
      .then(({itemAdded, itemChanged, itemRemoved, unsubscribe}) => {
        itemAdded.subscribe({
          next: task => {
            const id = task.id.value;
            console.log(`Retrieved task '${id}'`);
            if (taskIds.includes(id)) {
              count++;
              if (count === TASKS_TO_BE_CREATED) {
                unsubscribe();
                done();
              }
            }
          }
        });
        itemRemoved.subscribe({
          next: fail(done, 'Unexpected entity remove during entity create subscription test.')
        });
        itemChanged.subscribe({
          next: fail(done, 'Unexpected entity change during entity create subscription test.')
        });
      })
      .catch(fail(done));

    const commands = given.createTaskCommands({
      count: TASKS_TO_BE_CREATED,
      withPrefix: 'spine-web-test-subscribe',
      named: ['Task #1', 'Task #2', 'Task #3']
    });
    taskIds = commands.map(command => command.message.getId().getValue());
    commands.forEach(command => {
      backendClient.sendCommand(command, given.noop, fail(done), fail(done));
    });
  });

  it('subscribe to entity changes of type', done => {
    const TASKS_TO_BE_CHANGED = 3;
    let taskIds;
    let countChanged = 0;
    const initialTaskNames = ['Created task #1', 'Created task #2', 'Created task #3'];

    backendClient.subscribeToEntities({ofType: given.TYPE.OF_ENTITY.TASK})
      .then(({itemAdded, itemChanged, itemRemoved, unsubscribe}) => {
        itemAdded.subscribe({
          next: item => {
            const id = item.id.value;
            console.log(`Retrieved new task '${id}'.`);
            if (taskIds.includes(id)) {
              assert.ok(
                initialTaskNames.includes(item.name),
                `Task is named "${item.name}", expected one of [${initialTaskNames}]`
              );
            }
          }
        });
        itemRemoved.subscribe({
          next: fail(done, 'Task was removed in a test of entity changes subscription.')
        });
        itemChanged.subscribe({
          next: item => {
            const id = item.id.value;
            if (taskIds.includes(id)) {
              console.log(`Got task changes for ${id}.`);
              countChanged++;
              if (countChanged === TASKS_TO_BE_CHANGED) {
                unsubscribe();
                done();
              }
            } else {
              done(new Error('Unexpected entity changes during subscription to entity changes test'));
            }
          }
        });
      })
      .catch(fail(done));

    // Create tasks.
    const createCommands = given.createTaskCommands({
      count: TASKS_TO_BE_CHANGED,
      withPrefix: 'spine-web-test-subscribe',
      named: initialTaskNames
    });
    taskIds = createCommands.map(command => command.message.getId().getValue());
    const createPromises = [];
    createCommands.forEach(command => {
      const promise = new Promise(resolve => {
        backendClient.sendCommand(
          command,
          () => {
            console.log(`Task '${command.message.getId().getValue()}' created.`);
            resolve();
          },
          fail(done, 'Unexpected error while creating a task.'),
          fail(done, 'Unexpected rejection while creating a task.')
        );
      });
      createPromises.push(promise);
    });

    // Rename created tasks.
    Promise.all(createPromises).then(() => {
      // Rename tasks in a timeout after they are created to 
      // allow for added subscriptions to be updated first.
      setTimeout(() => {
        taskIds.forEach(taskId => {
          const renameCommand = given.renameTaskCommand({
            withId: taskId,
            to: `Renamed '${taskId}'`
          });
          backendClient.sendCommand(
            renameCommand,
            () => console.log(`Task '${taskId}' renamed.`),
            fail(done, 'Unexpected error while renaming a task.'),
            fail(done, 'Unexpected rejection while renaming a task.')
          );
        });
      }, 30 * SECONDS);
    });
  });

  it('subscribe to entity changes by id', done => {
    const expectedChangesCount = 2;
    const initialTaskName = 'Initial task name';
    const expectedRenames = ['Renamed once', 'Renamed twice'];

    // Create tasks.
    const createCommand = given.createTaskCommand({
      withPrefix: 'spine-web-test-subscribe',
      named: initialTaskName
    });
    const taskId = new TypedMessage(createCommand.message.getId(), given.TYPE.OF_IDENTIFIER.TASK_ID);
    const taskIdValue = createCommand.message.getId().getValue();

    const promise = new Promise(resolve => {
      backendClient.sendCommand(
        createCommand,
        () => {
          console.log(`Task '${taskIdValue}' created.`);
          resolve();
        },
        fail(done, 'Unexpected error while creating a task.'),
        fail(done, 'Unexpected rejection while creating a task.')
      );
    });

    let changesCount = 0;
    backendClient.subscribeToEntities({ofType: given.TYPE.OF_ENTITY.TASK, byId: taskId})
      .then(({itemAdded, itemChanged, itemRemoved, unsubscribe}) => {
        itemAdded.subscribe({
          next: item => {
            const id = item.id.value;
            console.log(`Retrieved new task '${id}'.`);
            if (taskIdValue === id) {
              assert.equal(
                item.name, initialTaskName,
                `Task is named "${item.name}", expected "${initialTaskName}"`
              );
            } else {
              done(new Error(`Only changes for task with ID ${taskIdValue} should be received.`))
            }
          }
        });
        itemRemoved.subscribe({
          next: fail(done, 'Task was removed in a test of entity changes subscription.')
        });
        itemChanged.subscribe({
          next: item => {
            const id = item.id.value;
            if (taskIdValue === id) {
              console.log(`Got task changes for ${id}.`);
              assert.equal(item.name, expectedRenames[changesCount]);
              changesCount++;
              if (changesCount === expectedChangesCount) {
                unsubscribe();
                done();
              }
            } else {
              done(new Error('Unexpected entity changes during subscription to entity changes test'));
            }
          }
        });
      })
      .catch(fail(done));

    // Rename created task.
    promise.then(() => {
      // Tasks are renamed with a timeout after to allow for changes to show up in subscriptions.
      return new Promise(resolve => {
        setTimeout(() => {
          const renameCommand = given.renameTaskCommand({
            withId: taskIdValue,
            to: 'Renamed once'
          });
          backendClient.sendCommand(
            renameCommand,
            () => {
              resolve();
              console.log(`Task '${taskIdValue}' renamed for the first time.`)
            },
            fail(done, 'Unexpected error while renaming a task.'),
            fail(done, 'Unexpected rejection while renaming a task.')
          );
        }, 20 * SECONDS);
      });
    }).then(() => {
      setTimeout(() => {
        const renameCommand = given.renameTaskCommand({
          withId: taskIdValue,
          to: 'Renamed twice'
        });
        backendClient.sendCommand(
          renameCommand,
          () => console.log(`Task '${taskIdValue}' renamed for the second time.`),
          fail(done, 'Unexpected error while renaming a task.'),
          fail(done, 'Unexpected rejection while renaming a task.')
        );
      }, 20 * SECONDS);
    });
  });

  it('fail a malformed subscription', done => {
    backendClient.subscribeToEntities({ofType: given.TYPE.MALFORMED})
      .then(() => {
        done(new Error('A malformed subscription should not yield results.'));
      })
      .catch(error => {
        assert.ok(true);
        done();
      });
  });
});
