package com.muse.service.backend.repository;

import com.muse.service.backend.entity.ImageAsset;
import com.muse.service.backend.entity.ImageVariant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageVariantRepository extends JpaRepository<ImageVariant, Integer> {

    List<ImageVariant> findAllByImage_ImageId(Integer imageId);

    List<ImageVariant> findAllByImageIn(Collection<ImageAsset> images);

    Optional<ImageVariant> findByImage_ImageIdAndVariantType(Integer imageId, ImageVariant.VariantType variantType);
}
