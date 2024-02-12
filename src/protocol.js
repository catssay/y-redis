import * as Y from 'yjs'
import * as error from 'lib0/error'
import * as encoding from 'lib0/encoding'
import * as array from 'lib0/array'
import * as awarenessProtocol from 'y-protocols/awareness'

export const messageSync = 0
export const messageAwareness = 1
export const messageAuth = 2
export const messageQueryAwareness = 3

export const messageSyncStep1 = 0
export const messageSyncStep2 = 1
export const messageSyncUpdate = 2

/**
 * @todo this should emit a single message
 *
 * Merge messages for easier comsumption by the client.
 *
 * This is useful, for example, when the server catches messages from a pubsub / stream.
 * Before the server sends the messages to the clients, we can merge updates, and filter out older
 * awareness messages.
 *
 * @param {Array<Uint8Array>} messages
 */
export const mergeMessages = messages => {
  if (messages.length < 2) {
    return messages
  }
  const aw = new awarenessProtocol.Awareness(new Y.Doc())
  /**
   * @type {Array<Uint8Array>}
   */
  const updates = []
  messages.forEach(m => {
    if (m[0] === messageSync && m[1] === 1) { // update message
      updates.push(m.slice(2))
    } else if (m[0] === messageAwareness) {
      awarenessProtocol.applyAwarenessUpdate(aw, m.slice(1), null)
    } else {
      error.unexpectedCase() // unexpected message type
    }
  })
  /**
   * @type {Array<Uint8Array>}
   */
  const result = []
  updates.length > 0 && result.push(encoding.encode(encoder => {
    encoding.writeVarUint(encoder, messageSync)
    encoding.writeVarUint(encoder, 1) // update
    encoding.writeVarUint8Array(encoder, Y.mergeUpdates(updates))
  }))
  aw.states.size > 0 && result.push(encoding.encode(encoder => {
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        aw,
        array.from(aw.getStates().keys())
      )
    )
  }))
  return result
}

/**
 * @param {Uint8Array} sv
 */
export const encodeSyncStep1 = sv => encoding.encode(encoder => {
  encoding.writeVarUint(encoder, messageSync)
  encoding.writeVarUint(encoder, messageSyncStep1)
  encoding.writeVarUint8Array(encoder, sv)
})

/**
 * @param {Uint8Array} diff
 */
export const encodeSyncStep2 = diff => encoding.encode(encoder => {
  encoding.writeVarUint(encoder, messageSync)
  encoding.writeVarUint(encoder, messageSyncStep2)
  encoding.writeVarUint8Array(encoder, diff)
})

/**
 * @param {awarenessProtocol.Awareness} awareness
 * @param {Array<number>} clients
 */
export const encodeAwarenessUpdate = (awareness, clients) => encoding.encode(encoder => {
  encoding.writeVarUint(encoder, messageAwareness)
  encoding.writeUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, clients))
})
