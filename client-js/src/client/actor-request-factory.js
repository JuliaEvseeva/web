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

"use strict";

import uuid from 'uuid';

import {Timestamp} from 'spine-web-client-proto/google/protobuf/timestamp_pb';
import {Query, QueryId} from 'spine-web-client-proto/spine/client/query_pb';
import {Topic, TopicId} from 'spine-web-client-proto/spine/client/subscription_pb';
import {
  ColumnFilter,
  CompositeColumnFilter,
  EntityFilters,
  EntityId,
  EntityIdFilter,
  Target
} from 'spine-web-client-proto/spine/client/entities_pb';
import {ActorContext} from 'spine-web-client-proto/spine/core/actor_context_pb';
import {Command, CommandContext, CommandId} from 'spine-web-client-proto/spine/core/command_pb';
import {UserId} from 'spine-web-client-proto/spine/core/user_id_pb';
import {ZoneId, ZoneOffset} from 'spine-web-client-proto/spine/time/time_pb';
import {FieldMask} from 'spine-web-client-proto/google/protobuf/field_mask_pb';
import {Type, TypedMessage} from './typed-message';
import {AnyPacker} from './any-packer';


/**
 * A factory for `ColumnFilter` and `CompositeColumnFilter` instances.
 */
export class ColumnFilters {

  /**
   * Instantiation not allowed and will throw an error.
   */
  constructor() {
    throw new Error('Tried instantiating a utility class.');
  }

  /**
   * Creates a new filter for the value of named column to be equal to the provided value.
   *
   * @param {!String} columnName a string name of the entity column
   * @param {!TypedMessage} value a value to compare the column value to
   *
   * @return {ColumnFilter} a new column filter
   */
  static eq(columnName, value) {
    return ColumnFilters.with(columnName, ColumnFilter.Operator.EQUAL, value);
  }

  /**
   * Creates a new filter for the value of named column to be less than the provided value.
   *
   * @param {!String} columnName a string name of the entity column
   * @param {!TypedMessage} value a value to compare the column value to
   *
   * @return {ColumnFilter} a new column filter
   */
  static lt(columnName, value) {
    return ColumnFilters.with(columnName, ColumnFilter.Operator.LESS_THAN, value);
  }

  /**
   * Creates a new filter for the value of named column to be greater than the provided value.
   *
   * @param {!String} columnName a string name of the entity column
   * @param {!TypedMessage} value a value to compare the column value to
   *
   * @return {ColumnFilter} a new column filter
   */
  static gt(columnName, value) {
    return ColumnFilters.with(columnName, ColumnFilter.Operator.GREATER_THAN, value);
  }

  /**
   * Creates a new filter for the value of named column to be less or equal compared to
   * the provided value.
   *
   * @param {!String} columnName a string name of the entity column
   * @param {!TypedMessage} value a value to compare the column value to
   *
   * @return {ColumnFilter} a new column filter
   */
  static le(columnName, value) {
    return ColumnFilters.with(columnName, ColumnFilter.Operator.LESS_OR_EQUAL, value);
  }

  /**
   * Creates a new filter for the value of named column to be greater or equal compared to
   * the provided value.
   *
   * @param {!String} columnName a string name of the entity column
   * @param {!TypedMessage} value a value to compare the column value to
   *
   * @return {ColumnFilter} a new column filter
   */
  static ge(columnName, value) {
    return ColumnFilters.with(columnName, ColumnFilter.Operator.GREATER_OR_EQUAL, value);
  }

  /**
   * Creates a filter for a column by name to match the provided value according to an operator.
   *
   * @param {!String} columnName a string name of the entity column
   * @param {!ColumnFilter.Operator} operator an operator to check column value to filter
   * @param {!TypedMessage} value a value to compare the column value to
   *
   * @return {ColumnFilter} a new column filter
   */
  static with(columnName, operator, value) {
    const wrappedValue = AnyPacker.packTyped(value);
    const filter = new ColumnFilter();
    filter.setColumnName(columnName);
    filter.setValue(wrappedValue);
    filter.setOperator(operator);
    return filter;
  }

  /**
   * Creates a new composite filter which matches entities that fit every provided filter.
   *
   * @param {!ColumnFilter[]} filters an array of column filters
   *
   * @return {CompositeColumnFilter} a new composite filter with `ALL` operator
   */
  static all(filters) {
    return ColumnFilters.compose(filters, CompositeColumnFilter.CompositeOperator.ALL);
  }

  /**
   * Creates a new composite filter which matches entities that fit at least one
   * of the provided filters.
   *
   * @param {!ColumnFilter[]} filters an array of column filters
   *
   * @return {CompositeColumnFilter} a new composite filter with `EITHER` operator
   */
  static either(filters) {
    return ColumnFilters.compose(filters, CompositeColumnFilter.CompositeOperator.EITHER);
  }

  /**
   * Creates a new composite filter which matches entities according to an array of filters with a
   * specified logical operator.
   *
   * @param {!ColumnFilter[]} filters an array of column filters
   * @param {!CompositeColumnFilter.CompositeOperator} operator a logical operator for `filters`
   *
   * @return {CompositeColumnFilter} a new composite filter
   */
  static compose(filters, operator) {
    const compositeFilter = new CompositeColumnFilter();
    compositeFilter.setFilterList(filters);
    compositeFilter.setOperator(operator);
    return compositeFilter;
  }
}

/**
 * Utilities for working with `Query` and `Topic` targets.
 */
class Targets {

  /**
   * Instantiation not allowed and will throw an error.
   */
  constructor() {
    throw new Error('Tried instantiating a utility class.');
  }

  /**
   * Composes a new target for entities of specified type, optionally with specified IDs and
   * columnFilters.
   *
   * @param {!Type} forType a Type URL for all target entities to match
   * @param {?TypedMessage[]} withIds an array of IDs one of which must be matched by each target entity
   * @param {?CompositeColumnFilter[]} filteredBy an array of filters target
   *
   * @return {Target} a newly created target for entities with specified filters
   */
  static compose({forType: type, withIds: ids, filteredBy: columnFilters}) {
    const includeAll = !ids && !columnFilters;

    if (includeAll) {
      return Targets._all(type);
    }

    const filters = new EntityFilters();

    const entityIds = Targets._nullToEmpty(ids);
    if (entityIds.length) {
      const idFilter = Targets._assembleIdFilter(entityIds);
      filters.setIdFilter(idFilter);
    }

    const entityColumnValues = Targets._nullToEmpty(columnFilters);
    if (entityColumnValues) {
      filters.setFilterList(entityColumnValues);
    }

    return Targets._filtered(type, filters);
  }

  /**
   * Creates a new target including all items of type.
   *
   * @param {!Type} type
   * @return {Target}
   * @private
   */
  static _all(type) {
    const target = new Target();
    target.setType(type.url().value());
    target.setIncludeAll(true);
    return target;
  }

  /**
   * Creates a new target including only entities of the specified type that pass filtering.
   *
   * @param {!Type} type
   * @param {!EntityFilters} filters
   * @return {Target}
   * @private
   */
  static _filtered(type, filters) {
    const target = new Target();
    target.setType(type.url().value());
    target.setFilters(filters);
    return target;
  }

  /**
   * Creates an targets ID filter including only items which are included in the provided ID list.
   *
   * @param {!TypedMessage[]} entityIds an array of IDs for entities matching target to be included in
   * @return {EntityIdFilter}
   * @private
   */
  static _assembleIdFilter(entityIds) {
    const idFilter = new EntityIdFilter();
    entityIds.forEach(rawId => {
      const packedId = AnyPacker.packTyped(rawId);
      const entityId = new EntityId();
      entityId.setId(packedId);
      idFilter.addIds(entityId);
    });
    return idFilter;
  }

  /**
   * @param {?T[]} input
   * @return {T[]} an empty array if the value is `null`, or the provided input otherwise
   * @template <T> type of items in the provided array
   * @private
   */
  static _nullToEmpty(input) {
    if (input == null) {
      return [];
    } else {
      return input;
    }
  }
}

/**
 * An abstract base for builders that create `Message` instances which have a `Target`
 * and a `FieldMask` as attributes.
 *
 * <p>The `Target` matching the builder configuration is accessed with `#getTarget()`,
 * while the `FieldMask` is retrieved with `#getMask()`.
 *
 * The public API of this class is inspired by the SQL syntax.
 * ```javascript
 *     select(CUSTOMER_TYPE) // returning <AbstractTargetBuilder> descendant instance
 *         .byIds(getWestCoastCustomerIds())
 *         .withMask(["name", "address", "email"])
 *         .where([
 *             ColumnFilters.eq("type", "permanent"),
 *             ColumnFilters.eq("discountPercent", 10),
 *             ColumnFilters.eq("companySize", Company.Size.SMALL)
 *         ])
 *         .build()
 * ```
 *
 * @template <T>
 *         a type of the message which is returned by the implementations `#build()`
 * @abstract
 */
class AbstractTargetBuilder {

  constructor(type) {
    /**
     * @type {Type}
     * @private
     */
    this._type = type;
    /**
     * @type {TypedMessage[]}
     * @private
     */
    this._ids = null;
    /**
     * @type {CompositeColumnFilter[]}
     * @private
     */
    this._columns = null;
    /**
     * @type {FieldMask}
     * @private
     */
    this._fieldMask = null;
  }

  /**
   * Sets an ID predicate of the `Query#getTarget()`.
   *
   * Makes the query return only the entities identified by the provided IDs.
   *
   * Supported ID types are string, number, and `TypedMessage`. To use other primitive types
   * wrap them in type message using Protobuf primitive wrappers (e.g. StringValue, BytesValue).
   *
   * If number IDs are passed they are assumed to be of `int64` Protobuf type.
   *
   * @param {!TypedMessage[]|Number[]|String[]} ids an array with identifiers of entities to query
   * @return {this} the current builder instance
   * @throws if this method is executed more than once
   * @throws if the provided IDs are not an instance of `Array`
   * @throws if any of provided IDs are not an instance of `TypedMessage`
   */
  byIds(ids) {
    if (this._ids !== null) {
      throw new Error('Can not set query ID more than once for QueryBuilder.');
    }
    if (!(ids instanceof Array)) {
      throw new Error('Only an array of IDs is allowed as parameter to QueryBuilder#byIds().');
    }
    if (!ids.length) {
      return this;
    }
    const invalidTypeMessage = 'Each provided ID must be a string, number or a TypedMessage.';
    if (ids[0] instanceof Number || typeof ids[0] === 'number') {
      AbstractTargetBuilder._checkAllOfType(ids, Number, invalidTypeMessage);
      this._ids = ids.map(TypedMessage.int64);
    } else if (ids[0] instanceof String || typeof ids[0] === 'string') {
      AbstractTargetBuilder._checkAllOfType(ids, String, invalidTypeMessage);
      this._ids = ids.map(TypedMessage.string);
    } else {
      AbstractTargetBuilder._checkAllOfType(ids, TypedMessage, invalidTypeMessage);
      this._ids = ids.slice();
    }
    return this;
  }

  /**
   * Sets an Entity Column predicate of the `Query#getTarget()`.
   *
   * <p>If there are no `ColumnFilter`s (i.e. the provided array is empty), all
   * the records will be returned by executing the `Query`.
   *
   * <p>An array of predicates provided to this method are considered to be joined in
   * a conjunction (using `CompositeColumnFilter.CompositeOperator#ALL`). This means
   * a record would match this query only if it matches all of the predicates.
   *
   * @param {!ColumnFilter[]|CompositeColumnFilter[]} predicates
   * the predicates to filter the requested entities by
   * @return {this} self for method chaining
   * @throws if this method is executed more than once
   * @see ColumnFilters a convenient way to create `ColumnFilter`s
   */
  where(predicates) {
    if (this._columns !== null) {
      throw new Error('Can not set filters more than once for QueryBuilder.');
    }
    if (!(predicates instanceof Array)) {
      throw new Error('Only an array of predicates is allowed as parameter to QueryBuilder#where().');
    }
    if (!predicates.length) {
      return this;
    }
    if (predicates[0] instanceof ColumnFilter) {
      AbstractTargetBuilder._checkAllOfType(predicates, ColumnFilter, INVALID_FILTER_TYPE);
      const aggregatingFilter = ColumnFilters.all(predicates);
      this._columns = [aggregatingFilter];
    } else {
      AbstractTargetBuilder._checkAllOfType(predicates, CompositeColumnFilter, INVALID_FILTER_TYPE);
      this._columns = predicates.slice();
    }
    return this;
  }

  /**
   * Sets a Field Mask of the `Query`.
   *
   * The names of the fields must be formatted according to the `FieldMask`
   * specification.
   *
   * If there are no fields (i.e. an empty array is passed), all the fields will
   * be returned by query.
   *
   * @param {!String[]} fieldNames
   * @return {this} self for method chaining
   * @throws if this method is executed more than once
   * @see FieldMask specification for `FieldMask`
   */
  withMask(fieldNames) {
    if (this._fieldMask != null) {
      throw new Error('Can not set field mask more than once for QueryBuilder.');
    }
    if (!(fieldNames instanceof Array)) {
      throw new Error('Only an array of strings is allowed as parameter to QueryBuilder#withMask().');
    }
    AbstractTargetBuilder._checkAllOfType(fieldNames, String, 'Field names should be strings.');
    if (!fieldNames.length) {
      return this;
    }
    this._fieldMask = new FieldMask();
    this._fieldMask.setPathsList(fieldNames);
    return this;
  }

  /**
   * @return {Target} a target matching builders configuration
   */
  getTarget() {
    return this._buildTarget();
  }

  /**
   * Creates a new target `Target` instance based on this builder configuration.
   *
   * @return {Target} a new target
   */
  _buildTarget() {
    return Targets.compose({forType: this._type, withIds: this._ids, filteredBy: this._columns});
  }

  /**
   * @return {FieldMask} a fields mask set to this builder
   */
  getMask() {
    return this._fieldMask;
  }

  /**
   * A build method for creating instances of this builders target class.
   *
   * @return {T} a new target class instance
   * @abstract
   */
  build() {
    throw new Error('Not implemented in abstract base.');
  }

  /**
   * Checks that each provided item is an instance of the provided class. In case the check does
   * not pass an error is thrown.
   *
   * @param {![]} items an array of objects that are expected to be of the provided type
   * @param {!Object} cls a class each item is required to be instance of
   * @param {!String} message an error message thrown on type mismatch
   * @private
   */
  static _checkAllOfType(items, cls, message = 'Unexpected parameter type.') {
    if (cls === String) {
      AbstractTargetBuilder._checkAllAreStrings(items, message);
    } else if (cls === Number) {
      AbstractTargetBuilder._checkAllAreNumbers(items, message);
    } else if (cls === Boolean) {
      AbstractTargetBuilder._checkAllAreBooleans(items, message);
    } else {
      AbstractTargetBuilder._checkAllOfClass(cls, items, message);
    }
  }

  /**
   * @param {![]} items an array of objects that are expected to be strings
   * @param {!String} message an error message thrown on type mismatch
   * @private
   */
  static _checkAllAreStrings(items, message) {
    items.forEach(item => {
      if (typeof item !== 'string' && !(item instanceof String)) {
        throw new Error(message);
      }
    });
  }

  /**
   * @param {![]} items an array of objects that are expected to be numbers
   * @param {!String} message an error message thrown on type mismatch
   * @private
   */
  static _checkAllAreNumbers(items, message) {
    items.forEach(item => {
      if (typeof item !== 'number' && !(item instanceof Number)) {
        throw new Error(message);
      }
    });
  }

  /**
   * @param {![]} items an array of objects that are expected to be booleans
   * @param {!String} message an error message thrown on type mismatch
   * @private
   */
  static _checkAllAreBooleans(items, message) {
    items.forEach(item => {
      if (typeof item !== 'boolean' && !(item instanceof Boolean)) {
        throw new Error(message);
      }
    });
  }

  /**
   * @param {!Object} cls a class tyo check items against
   * @param {![]} items an array of objects that are expected to instances of class
   * @param {!String} message an error message thrown on type mismatch
   * @private
   */
  static _checkAllOfClass(cls, items, message) {
    items.forEach(item => {
      if (!(item instanceof cls)) {
        throw new Error(message);
      }
    });
  }
}

const INVALID_FILTER_TYPE =
  'All filters passed to QueryFilter#where() must be of a single type: ' +
  'either ColumnFilter or CompositeColumnFilter.';

/**
 * A builder for creating `Query` instances. A more flexible approach to query creation
 * than using a `QueryFactory`.
 *
 * @extends {AbstractTargetBuilder<Query>}
 */
class QueryBuilder extends AbstractTargetBuilder {

  /**
   * @param {!Type} type
   * @param {!QueryFactory} queryFactory
   */
  constructor(type, queryFactory) {
    super(type);
    /**
     * @type {QueryFactory}
     * @private
     */
    this._factory = queryFactory;
  }

  /**
   * Creates the Query instance based on the current builder configuration.
   *
   * @return {Query} a new query
   */
  build() {
    const target = this.getTarget();
    const fieldMask = this.getMask();
    return this._factory.compose({forTarget: target, withMask: fieldMask});
  }
}

/**
 * A factory for creating `Query` instances specifying the data to be retrieved from Spine server.
 *
 * @see ActorRequestFactory#query()
 */
class QueryFactory {

  /**
   * @param {!ActorRequestFactory} requestFactory
   */
  constructor(requestFactory) {
    this._requestFactory = requestFactory;
  }

  /**
   * Creates a new builder of `Query` instances of the provided type
   * @param {!Type} type a type URL of the target type
   * @return {QueryBuilder}
   */
  select(type) {
    return new QueryBuilder(type, this);
  }

  /**
   * Creates a new `Query` which would return only entities which conform the target specification.
   *
   * An optional field mask can be provided to specify particular fields to be returned for `Query`
   *
   * @param {!Target} forTarget a specification of type and filters for `Query` result to match
   * @param {?FieldMask} withMask a specification of fields to be returned by executing `Query`
   * @return {Query}
   */
  compose({forTarget: target, withMask: fieldMask}) {
    return this._newQuery(target, fieldMask);
  }

  /**
   * @param {!Target} target a specification of type and filters for `Query` result to match
   * @param {?FieldMask} fieldMask a specification of fields to be returned by executing `Query`
   * @return {Query} a new query instance
   * @private
   */
  _newQuery(target, fieldMask) {
    const id = QueryFactory._newId();
    const actorContext = this._requestFactory._actorContext();

    const result = new Query();
    result.setId(id);
    result.setTarget(target);
    result.setFieldMask(fieldMask);
    result.setContext(actorContext);

    return result;
  }

  /**
   * @return {QueryId}
   * @private
   */
  static _newId() {
    const result = new QueryId();
    result.setValue(`q-${uuid.v4()}`);
    return result;
  }
}

/**
 * A factory of `Command` instances.
 *
 * Uses the given `ActorRequestFactory` as the source of the command meta information,
 * such as the actor, the tenant, etc.
 *
 * @see ActorRequestFactory#command()
 */
class CommandFactory {

  constructor(actorRequestFactory) {
    this._requestFactory = actorRequestFactory;
  }

  /**
   * Creates a `Command` from the given command message.
   *
   * @param {!TypedMessage} message a typed command message
   * @return {TypedMessage<Command>} a typed representation of the Spine Command
   */
  create(message) {
    const id = CommandFactory._newCommandId();
    const messageAny = AnyPacker.packTyped(message);
    const context = this._commandContext();

    const result = new Command();
    result.setId(id);
    result.setMessage(messageAny);
    result.setContext(context);
    return new TypedMessage(result, Type.COMMAND);
  }

  _commandContext() {
    const result = new CommandContext();
    const actorContext = this._requestFactory._actorContext();
    result.setActorContext(actorContext);
    return result;
  }

  /**
   * @return {CommandId}
   * @private
   */
  static _newCommandId() {
    const result = new CommandId();
    result.setUuid(uuid.v4());
    return result;
  }
}

/**
 * A builder for creating `Topic` instances. A more flexible approach to query creation
 * than using a `TopicFactory`.
 *
 * @extends {AbstractTargetBuilder<Topic>}
 */
class TopicBuilder extends AbstractTargetBuilder {

  /**
   * @param {!Type} type
   * @param {!TopicFactory} topicFactory
   */
  constructor(type, topicFactory) {
    super(type);
    /**
     * @type {TopicFactory}
     * @private
     */
    this._factory = topicFactory;
  }

  /**
   * Creates the `Topic` instance based on the current builder configuration.
   *
   * @return {Topic} a new topic
   */
  build() {
    return this._factory.compose({
      forTarget: this.getTarget(),
      withMask: this.getMask(),
    });
  }
}

/**
 * A factory of {@link Topic} instances.
 *
 * Uses the given {@link ActorRequestFactory} as the source of the topic meta information,
 * such as the actor.
 *
 * @see ActorRequestFactory#topic()
 */
class TopicFactory {

  /**
   * @param {!ActorRequestFactory} actorRequestFactory
   * @constructor
   */
  constructor(actorRequestFactory) {
    this._requestFactory = actorRequestFactory;
  }

  /**
   * Creates a new builder of `Topic` instances of the provided type
   * @param {!Type} type a type URL of the target type
   * @return {TopicBuilder}
   */
  select(type) {
    return new TopicBuilder(type, this);
  }

  /**
   * Creates a `Topic` for all of the specified entity states.
   *
   * @param {!Type} of the class of a target entity
   * @param {?TypedMessage[]} withIds the IDs of interest
   * @return {Topic} an instance of `Topic` assembled according to the parameters
   */
  all({of: type, withIds: ids}) {
    const target = Targets.compose({forType: type, withIds: ids});
    return this.compose({forTarget: target});
  }

  /**
   * Creates a `Topic` for the specified `Target`.
   *
   * @param {!Target} forTarget a `Target` to create a topic for
   * @param {?FieldMask} withMask a mask specifying fields to be returned
   * @return {Topic} the instance of `Topic`
   */
  compose({forTarget: target, withMask: fieldMask}) {
    const id = TopicFactory._generateId();
    const topic = new Topic();
    topic.setId(id);
    topic.setContext(this._requestFactory._actorContext());
    topic.setTarget(target);
    topic.setFieldMask(fieldMask);
    return topic;
  }

  /**
   * @return {TopicId} a newly created topic ID
   * @private
   */
  static _generateId() {
    const topicId = new TopicId();
    topicId.setValue(`t-${uuid.v4()}`);
    return topicId;
  }
}

/**
 * A factory for the various requests fired from the client-side by an actor.
 */
export class ActorRequestFactory {

  /**
   * Creates a new instance of ActorRequestFactory for the given actor.
   *
   * @param {!string} actor a string identifier of an actor
   */
  constructor(actor) {
    this._actor = new UserId();
    this._actor.setValue(actor);
  }

  /**
   * Creates a new query factory for building various queries based on configuration of this
   * `ActorRequestFactory` instance.
   *
   * @return {QueryFactory}
   */
  query() {
    return new QueryFactory(this);
  }

  /**
   * Creates a new command factory for building various commands based on configuration of this
   * `ActorRequestFactory` instance.
   *
   * @return {CommandFactory}
   */
  command() {
    return new CommandFactory(this);
  }

  /**
   * Creates a new topic factory for building subscription topics based on configuration of this
   * `ActorRequestFactory` instance.
   *
   * @return {TopicFactory}
   */
  topic() {
    return new TopicFactory(this);
  }

  _actorContext() {
    const result = new ActorContext();
    result.setActor(this._actor);
    const seconds = Math.round(new Date().getTime() / 1000);
    const time = new Timestamp();
    time.setSeconds(seconds);
    result.setTimestamp(time);
    result.setZoneOffset(ActorRequestFactory._zoneOffset());
    return result;
  }

  /**
   * @return {ZoneOffset}
   * @protected
   */
  static _zoneOffset() {
    const format = new Intl.DateTimeFormat();
    const timeOptions = format.resolvedOptions();
    const zoneId = new ZoneId();
    zoneId.setValue(timeOptions.timeZone);
    const zoneOffset = ActorRequestFactory._zoneOffsetSeconds();
    const result = new ZoneOffset();
    result.setAmountSeconds(zoneOffset);
    return result;
  }

  /**
   * @return {number}
   * @private
   */
  static _zoneOffsetSeconds() {
    return new Date().getTimezoneOffset() * 60;
  }
}
