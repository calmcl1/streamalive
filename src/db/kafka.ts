// import Kafka from 'node-rdkafka'

// const kafkaConfig: Kafka.ProducerGlobalConfig = {
//     // "metadata.broker.list": "rocket-01.srvs.cloudkafka.com:9094,rocket-03.srvs.cloudkafka.com:9094,rocket-02.srvs.cloudkafka.com:9094",
//     "bootstrap.servers": process.env.CONFLUENT_BROKERS,
//     // "socket.keepalive.enable": true,
//     "security.protocol": "sasl_ssl",
//     "sasl.mechanisms": "PLAIN",
//     "sasl.username": process.env.CONFLUENT_KEY,
//     "sasl.password": process.env.CONFLUENT_SECRET//,
//     //"debug": "generic,broker,security"
// }

// export const createStreamCheckEventProducer = () => {
//     // console.info(`Using brokers: ${process.env.CLOUDKARAFKA_BROKERS}`)
//     const p = new Kafka.Producer(kafkaConfig)
//     p.setPollInterval(100)
//     return p
// }

// export const createStreamCheckEventStream = () => Kafka.createReadStream({ ...kafkaConfig, "group.id": "streamalive-notifier" }, { "enable.auto.commit": false }, { topics: [process.env.KAFKA_STREAMCHECK_TOPIC!] })

// // export const createStreamCheckEventConsumer = () => {
// // const c = new Kafka.KafkaConsumer({...kafkaConfig,"group.id":"streamalive-notifier"},{})
// // }
// export const TOPIC_NAME_STREAM_CHECK_EVENT = process.env.KAFKA_STREAMCHECK_TOPIC || "streamcheck-testing"// process.env.CLOUDKARAFKA_TOPIC_PREFIX + "streamcheck"
