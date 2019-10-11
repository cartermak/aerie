package gov.nasa.jpl.ammos.mpsa.aerie.plan.controllers;

import gov.nasa.jpl.ammos.mpsa.aerie.merlinsdk.activities.representation.ParameterSchema;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.exceptions.NoSuchActivityInstanceException;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.exceptions.NoSuchAdaptationException;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.exceptions.NoSuchPlanException;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.exceptions.UnexpectedMissingAdaptationException;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.exceptions.ValidationException;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.models.ActivityInstance;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.models.NewPlan;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.models.Plan;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.remotes.AdaptationService;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.remotes.PlanRepository;
import gov.nasa.jpl.ammos.mpsa.aerie.plan.remotes.PlanRepository.PlanTransaction;
import org.apache.commons.lang3.tuple.Pair;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

public final class PlanController implements IPlanController {
  private final PlanRepository planRepository;
  private final AdaptationService adaptationService;
  private final PlanValidator validator;

  public PlanController(
      final PlanRepository planRepository,
      final AdaptationService adaptationService
  ) {
    this.planRepository = planRepository;
    this.adaptationService = adaptationService;
    this.validator = new PlanValidator(planRepository, adaptationService);
  }

  @Override
  public Stream<Pair<String, Plan>> getPlans() {
    return this.planRepository.getAllPlans();
  }

  @Override
  public Plan getPlanById(final String id) throws NoSuchPlanException {
    return this.planRepository.getPlan(id);
  }

  @Override
  public String addPlan(final NewPlan plan) throws ValidationException {
    withValidator(validator -> validator.validateNewPlan(plan));
    return this.planRepository.createPlan(plan);
  }

  @Override
  public void removePlan(final String id) throws NoSuchPlanException {
    this.planRepository.deletePlan(id);
  }

  @Override
  public void updatePlan(final String planId, final Plan patch) throws ValidationException, NoSuchPlanException, NoSuchActivityInstanceException {
    withValidator(validator -> validator.validatePlanPatch(planId, patch));

    final PlanTransaction transaction = this.planRepository.updatePlan(planId);
    if (patch.name != null) transaction.setName(patch.name);
    if (patch.startTimestamp != null) transaction.setStartTimestamp(patch.startTimestamp);
    if (patch.endTimestamp != null) transaction.setEndTimestamp(patch.endTimestamp);
    if (patch.adaptationId != null) transaction.setAdaptationId(patch.adaptationId);
    transaction.commit();

    if (patch.activityInstances != null) {
      this.planRepository.deleteAllActivities(planId);
      for (final var entry : patch.activityInstances.entrySet()) {
        if (entry.getValue() == null) {
          this.removeActivityInstanceById(planId, entry.getKey());
        } else {
          this.replaceActivityInstance(planId, entry.getKey(), entry.getValue());
        }
      }
    }
  }

  @Override
  public void replacePlan(final String id, final NewPlan plan) throws ValidationException, NoSuchPlanException {
    withValidator(validator -> validator.validateNewPlan(plan));
    this.planRepository.replacePlan(id, plan);
  }

  @Override
  public ActivityInstance getActivityInstanceById(final String planId, final String activityInstanceId) throws NoSuchPlanException, NoSuchActivityInstanceException {
    return this.planRepository.getActivityInPlanById(planId, activityInstanceId);
  }

  @Override
  public List<String> addActivityInstancesToPlan(final String planId, final List<ActivityInstance> activityInstances) throws ValidationException, NoSuchPlanException {
    {
      final String adaptationId = this.planRepository.getPlan(planId).adaptationId;

      final Map<String, Map<String, ParameterSchema>> activityTypes;
      try {
        activityTypes = this.adaptationService.getActivityTypes(adaptationId);
      } catch (final NoSuchAdaptationException ex) {
        throw new UnexpectedMissingAdaptationException(adaptationId, ex);
      }

      withValidator(validator -> validator.validateActivityList(activityInstances, activityTypes));
    }

    final List<String> activityInstanceIds = new ArrayList<>(activityInstances.size());
    for (final ActivityInstance activityInstance : activityInstances) {
      final String activityInstanceId = this.planRepository.createActivity(planId, activityInstance);
      activityInstanceIds.add(activityInstanceId);
    }

    return activityInstanceIds;
  }

  @Override
  public void removeActivityInstanceById(final String planId, final String activityInstanceId) throws NoSuchPlanException, NoSuchActivityInstanceException {
    this.planRepository.deleteActivity(planId, activityInstanceId);
  }

  @Override
  public void updateActivityInstance(final String planId, final String activityInstanceId, final ActivityInstance patch) throws NoSuchPlanException, NoSuchActivityInstanceException, ValidationException {
    final ActivityInstance activityInstance = this.planRepository.getActivityInPlanById(planId, activityInstanceId);

    if (patch.type != null) activityInstance.type = patch.type;
    if (patch.startTimestamp != null) activityInstance.startTimestamp = patch.startTimestamp;
    if (patch.parameters != null) activityInstance.parameters = patch.parameters;

    {
      final String adaptationId = this.planRepository.getPlan(planId).adaptationId;

      final Map<String, Map<String, ParameterSchema>> activityTypes;
      try {
        activityTypes = this.adaptationService.getActivityTypes(adaptationId);
      } catch (final NoSuchAdaptationException ex) {
        throw new UnexpectedMissingAdaptationException(adaptationId, ex);
      }

      withValidator(validator -> validator.validateActivity(activityInstance, activityTypes));
    }

    this.planRepository.replaceActivity(planId, activityInstanceId, activityInstance);
  }

  @Override
  public void replaceActivityInstance(final String planId, final String activityInstanceId, final ActivityInstance activityInstance) throws ValidationException, NoSuchPlanException, NoSuchActivityInstanceException {
    {
      final String adaptationId = this.planRepository.getPlan(planId).adaptationId;

      final Map<String, Map<String, ParameterSchema>> activityTypes;
      try {
        activityTypes = this.adaptationService.getActivityTypes(adaptationId);
      } catch (final NoSuchAdaptationException ex) {
        throw new UnexpectedMissingAdaptationException(adaptationId, ex);
      }

      withValidator(validator -> validator.validateActivity(activityInstance, activityTypes));
    }

    this.planRepository.replaceActivity(planId, activityInstanceId, activityInstance);
  }

  private <T extends Throwable> void withValidator(final ValidationScope<T> block) throws ValidationException, T {
    final var validator = new PlanValidator(this.planRepository, this.adaptationService);

    block.accept(validator);
    final var messages = validator.getMessages();

    if (messages.size() > 0) throw new ValidationException(messages);
  }

  @FunctionalInterface
  private interface ValidationScope<T extends Throwable> {
    void accept(PlanValidator validator) throws T;
  }
}
