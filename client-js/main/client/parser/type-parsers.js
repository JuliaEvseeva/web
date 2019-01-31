/*
 * Copyright 2019, TeamDev. All rights reserved.
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

import ObjectParser from './object-parser';
import {wellKnownParsers} from './well-known-parsers';

/**
 * The registry of parsers for known Protobuf types.
 *
 * <p>Parsers for {@link wellKnownParsers standard} Protobuf types are provided by the Spine Web
 * and automatically registered.
 *
 * <p>Other parsers are generated by the Protobuf plugin for Javascript and should be registered
 * by the users of the class.
 */
export default class TypeParsers {

  constructor() {
    throw new Error('TypeParsers is not supposed to be instantiated.');
  }

  /**
   * Registers the parser for a type.
   *
   * @param {!ObjectParser} parser the parser instance to register
   * @param {!string} typeUrl the URL of the type to register the parser for
   */
  static register(parser, typeUrl) {
    this._checkParser(parser, typeUrl);
    if (!parsers.has(typeUrl)) {
      parsers.set(typeUrl, parser);
    }
  }

  /**
   * Obtains a parser by the specified type URL.
   *
   * @param {!string} typeUrl the type URL to get the parser
   * @returns {!ObjectParser} the parser instance for the type
   */
  static parserFor(typeUrl) {
    const parser = parsers.get(typeUrl);
    if (parser === undefined) {
      throw new Error(`The parser for ${typeUrl} was not found.`);
    }
    return parser;
  }

  static _checkParser(parser, typeUrl) {
    if (!ObjectParser.isParser(parser)) {
      throw new Error(`Unable to register parser for ${typeUrl}. Should extend ObjectParser.`);
    }
  }
}

/**
 * Register parsers for standard Protobuf types.
 */
function registerWellKnownParsers() {
  for (let [typeUrl, parser] of wellKnownParsers) {
    TypeParsers.register(parser, typeUrl);
  }
}

/**
 * The map of all Protobuf parsers known to the application.
 *
 * <p>It is intended to be a static variable, but ES6 doesn't provide an easy way to do it.
 *
 * @type {Map<String, ObjectParser>}
 * @private
 */
const parsers = new Map();

registerWellKnownParsers();