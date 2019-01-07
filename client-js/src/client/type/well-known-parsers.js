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

import TypeParsers from './type-parsers';
import ObjectParser from './object-parser';

//TODO:2019-01-07:dmitry.grankin: Use ES6 imports;
let wrappers = require("google-protobuf/google/protobuf/wrappers_pb.js");
let struct = require("google-protobuf/google/protobuf/struct_pb.js");
let empty = require("google-protobuf/google/protobuf/empty_pb.js");
let timestamp = require("google-protobuf/google/protobuf/timestamp_pb.js");
let duration = require("google-protobuf/google/protobuf/duration_pb.js");
let fieldMask = require("google-protobuf/google/protobuf/field_mask_pb.js");
let any = require("google-protobuf/google/protobuf/any_pb.js");

/**
 * The parsers used to obtain Protobuf standard types from JSON.
 *
 * For the details about how the parsers work, see
 * https://developers.google.com/protocol-buffers/docs/proto3#json.
 */

export class BoolValueParser extends ObjectParser {

  fromObject(object) {
    let boolValue = new wrappers.BoolValue();
    boolValue.setValue(object);
    return boolValue;
  }
}

export class BytesValueParser extends ObjectParser {

  fromObject(object) {
    let bytesValue = new wrappers.BytesValue();
    bytesValue.setValue(object);
    return bytesValue;
  }
}

export class DoubleValueParser extends ObjectParser {

  fromObject(object) {
    let doubleValue = new wrappers.DoubleValue();
    doubleValue.setValue(object);
    return doubleValue;
  }
}

export class FloatValueParser extends ObjectParser {

  fromObject(object) {
    let floatValue = new wrappers.FloatValue();
    floatValue.setValue(object);
    return floatValue;
  }
}

export class Int32ValueParser extends ObjectParser {

  fromObject(object) {
    let int32Value = new wrappers.Int32Value();
    int32Value.setValue(object);
    return int32Value;
  }
}

export class Int64ValueParser extends ObjectParser {

  fromObject(object) {
    let int64Value = new wrappers.Int64Value();
    int64Value.setValue(object);
    return int64Value;
  }
}

export class StringValueParser extends ObjectParser {

  fromObject(object) {
    let stringValue = new wrappers.StringValue();
    stringValue.setValue(object);
    return stringValue;
  }
}

export class UInt32ValueParser extends ObjectParser {

  fromObject(object) {
    let uInt32Value = new wrappers.UInt32Value();
    uInt32Value.setValue(object);
    return uInt32Value;
  }
}

export class UInt64ValueParser extends ObjectParser {

  fromObject(object) {
    let uInt64Value = new wrappers.UInt64Value();
    uInt64Value.setValue(object);
    return uInt64Value;
  }
}

export class ListValueParser extends ObjectParser {

  fromObject(object) {
    let listValue = new struct.ListValue;
    object.forEach(
      function callback(currentValue, index, array) {
        let valueParser = new ValueParser();
        array[index] = valueParser.parse(currentValue);
      }
    );
    listValue.setValuesList(object);
    return listValue;
  }
}

export class ValueParser extends ObjectParser {

  fromObject(object) {
    let result = new struct.Value();
    if (object === null) {
      result.setNullValue(struct.NullValue.NULL_VALUE);
    } else if (typeof object === "number") {
      result.setNumberValue(object);
    } else if (typeof object === "string") {
      result.setStringValue(object);
    } else if (typeof object === "boolean") {
      result.setBoolValue(object);
    } else if (Array.isArray(object)) {
      let parser = new ListValueParser(object);
      let listValue = parser.parse(object);
      result.setListValue(listValue);
    } else {
      // Is a Struct, unhandled for now.
    }
    return result;
  }
}

export class EmptyParser extends ObjectParser {

  fromObject(object) {
    let emptyValue = new empty.Empty();
    return emptyValue;
  }
}

export class TimestampParser extends ObjectParser {

  fromObject(object) {
    let date = new Date(object);
    let result = new timestamp.Timestamp();
    result.fromDate(date);
    return result;
  }
}

export class DurationParser extends ObjectParser {

  fromObject(object) {
    object = object.substring(0, object.length - 1);
    let values = object.split(".");
    let result = new duration.Duration();
    if (values.length === 1) {
      result.setSeconds(values[0]);
    } else if (values.length === 2) {
      result.setSeconds(values[0]);
      let nanos = values[1];
      for (let i = 0; i < 9 - nanos.length; i++) {
        nanos += "0";
      }
      let nanosNumber = parseInt(nanos, 10);
      result.setNanos(nanosNumber);
    }
    return result;
  }
}

export class FieldMaskParser extends ObjectParser {

  fromObject(object) {
    let fieldMask = new fieldMask.FieldMask();
    fieldMask.setPathsList(object.split(","));
    return fieldMask;
  }
}

export class AnyParser extends ObjectParser {

  fromObject(object) {
    let typeUrl = object["@type"];
    let parser = TypeParsers.parserFor(typeUrl);
    let messageValue = parser.fromObject(object);
    let bytes = messageValue.serializeBinary();
    let anyMsg = new any.Any;
    anyMsg.setTypeUrl(typeUrl);
    anyMsg.setValue(bytes);
    return anyMsg;
  }
}
