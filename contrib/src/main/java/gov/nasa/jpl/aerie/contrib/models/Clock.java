package gov.nasa.jpl.aerie.contrib.models;

import gov.nasa.jpl.aerie.merlin.framework.Model;
import gov.nasa.jpl.aerie.merlin.framework.Registrar;
import gov.nasa.jpl.aerie.merlin.framework.resources.real.RealResource;

import java.time.Instant;

public final class Clock extends Model {
  public final RealResource ticks;
  private final Instant startTime;

  public Clock(final Registrar registrar, final Instant startTime) {
    super(registrar);
    this.startTime = startTime;
    this.ticks = new Accumulator(registrar, 0.0, 1000.0);
  }

  public double getElapsedMilliseconds() {
    return ticks.get();
  }

  public Instant getTime() {
    final var ticksCount = ticks.get();
    final var milli = (long) ticksCount;
    final var nano = (long) ((ticksCount - milli) * 1_000_000);

    return startTime.plusMillis(milli).plusNanos(nano);
  }
}
