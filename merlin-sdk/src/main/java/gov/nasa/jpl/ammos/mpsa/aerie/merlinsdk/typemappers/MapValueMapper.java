package gov.nasa.jpl.ammos.mpsa.aerie.merlinsdk.typemappers;

import gov.nasa.jpl.ammos.mpsa.aerie.merlinsdk.serialization.ValueSchema;
import gov.nasa.jpl.ammos.mpsa.aerie.merlinsdk.serialization.SerializedValue;
import gov.nasa.jpl.ammos.mpsa.aerie.merlinsdk.utilities.Result;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class MapValueMapper<K, V> implements ValueMapper<Map<K, V>> {
  private final ValueMapper<K> keyMapper;
  private final ValueMapper<V> elementMapper;

  public MapValueMapper(final ValueMapper<K> keyMapper, final ValueMapper<V> elementMapper) {
    this.keyMapper = keyMapper;
    this.elementMapper = elementMapper;
  }

  @Override
  public ValueSchema getValueSchema() {
    return ValueSchema.ofSequence(ValueSchema.ofStruct(Map.of(
        "key", keyMapper.getValueSchema(),
        "value", elementMapper.getValueSchema())));
  }

  @Override
  public Result<Map<K, V>, String> deserializeValue(final SerializedValue serializedValue) {
    return serializedValue
        .asList()
        .map(Result::<List<SerializedValue>, String>success)
        .orElseGet(() -> Result.failure("Expected list, got " + serializedValue.toString()))
        .match(
            serializedList -> {
              final var map = new HashMap<K, V>();
              for (final SerializedValue element : serializedList) {
                final var elementResult = element
                    .asMap()
                    .map(Result::<Map<String, SerializedValue>, String>success)
                    .orElseGet(() -> Result.failure("Expected map, got " + element));

                if (elementResult.getKind().equals(Result.Kind.Failure)) return Result.failure(elementResult.getFailureOrThrow());
                final var elementSpec = elementResult.getSuccessOrThrow();

                final var keyResult = keyMapper
                    .deserializeValue(elementSpec.get("key"));
                if (keyResult.getKind().equals(Result.Kind.Failure)) return Result.failure(keyResult.getFailureOrThrow());
                final var key = keyResult.getSuccessOrThrow();

                final var valueResult = elementMapper
                    .deserializeValue(elementSpec.get("value"));
                if (valueResult.getKind().equals(Result.Kind.Failure)) return Result.failure(valueResult.getFailureOrThrow());
                final var value = valueResult.getSuccessOrThrow();

                map.put(key, value);
              }

              return Result.success(map);
            },
            Result::failure
        );
  }

  @Override
  public SerializedValue serializeValue(final Map<K, V> fields) {
    final List<SerializedValue> elementSpecs = new ArrayList<>(fields.size());
    for (final var entry : fields.entrySet()) {
      elementSpecs.add(SerializedValue.of(
          Map.of(
              "key", keyMapper.serializeValue(entry.getKey()),
              "value", elementMapper.serializeValue(entry.getValue()))));
    }
    return SerializedValue.of(elementSpecs);
  }
}
